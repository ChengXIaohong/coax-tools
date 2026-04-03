/*
 * 小霸王游戏机 - NES 模拟器
 * 基于 JSNES v2
 * 音频策略：首次用户交互后启动 AudioContext，绕过 autoplay 限制
 * JSNES v1: onAudio(l, r) 左右声道，范围 [-32768, 32767]
 */

(function() {
    'use strict';

    // DOM 元素
    const uploadZone = document.getElementById('uploadZone');
    const uploadPrompt = document.getElementById('uploadPrompt');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const emulatorContainer = document.getElementById('emulatorContainer');
    const romInfo = document.getElementById('romInfo');
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    const nesScreen = document.getElementById('nesScreen');
    const screenWrapper = document.getElementById('screenWrapper');
    const resetBtn = document.getElementById('resetBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const loadNewBtn = document.getElementById('loadNewBtn');
    const gamepadHint = document.getElementById('gamepadHint');

    // 模拟器状态
    let nes = null;
    let isRunning = false;
    let isPaused = false;
    let currentROM = null;
    let romBuffer = null; // ArrayBuffer 原始数据
    let romString = null;  // ROM 字符串，JSNES v1 loadROM 需要
    let animationFrameId = null;

    // 键盘状态
    const keys = {
        KEY_LEFT: 0, KEY_RIGHT: 1, KEY_DOWN: 2, KEY_UP: 3,
        KEY_SELECT: 4, KEY_START: 5, KEY_B: 6, KEY_A: 7
    };

    // NES 键盘映射 (标准 FC 布局)
    const keyboardMap = {
        'ArrowLeft': keys.KEY_LEFT, 'ArrowRight': keys.KEY_RIGHT,
        'ArrowDown': keys.KEY_DOWN, 'ArrowUp': keys.KEY_UP,
        'Enter': keys.KEY_START, 'Shift': keys.KEY_SELECT,
        'KeyZ': keys.KEY_B, 'KeyX': keys.KEY_A
    };

    const pressedKeys = new Set();

    // Web Audio 状态
    let audioCtx = null;
    let audioQueue = [];
    let audioProcessor = null;
    const QUEUE_LIMIT = 48000; // 1秒音频缓冲

    // Gamepad 状态
    let gamepadIndex = null;
    let gamepadPollInterval = null;

    // ========================================
    // Web Audio 核心
    // ========================================

    function initAudioContext() {
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            createAudioGraph();
            console.log('AudioContext 初始化成功，state:', audioCtx.state);
        } catch(e) {
            console.warn('AudioContext 创建失败:', e);
            audioCtx = null;
        }
    }

    function createAudioGraph() {
        if (!audioCtx) return;

        // 使用 ScriptProcessorNode（带显式错误处理）
        const bufferSize = 4096;
        audioProcessor = audioCtx.createScriptProcessor(bufferSize, 0, 2);

        audioProcessor.onaudioprocess = function(e) {
            const outL = e.outputBuffer.getChannelData(0);
            const outR = e.outputBuffer.getChannelData(1);
            for (let i = 0; i < bufferSize; i++) {
                if (audioQueue.length > 0) {
                    const s = audioQueue.shift();
                    outL[i] = s;
                    outR[i] = s;
                } else {
                    outL[i] = 0;
                    outR[i] = 0;
                }
            }
        };

        audioProcessor.connect(audioCtx.destination);
    }

    function resumeAudio() {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(e => console.warn('Audio resume 失败:', e));
        }
    }

    // JSNES v1 onAudio 回调：(l, r) 左右声道，范围 [-32768, 32767]
    function onAudioSample(l, r) {
        if (!audioCtx) return;
        if (audioQueue.length < QUEUE_LIMIT) {
            // 归一化到 [-1, 1]
            audioQueue.push(Math.max(-1, Math.min(1, l / 32768)));
        }
    }

    // ========================================
    // 初始化
    // ========================================

    function init() {
        setupEventListeners();
        setupKeyboardControls();
        setupGamepadDetection();
    }

    // ========================================
    // 事件监听
    // ========================================

    function setupEventListeners() {
        selectFileBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) loadROM(file);
        });

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.nes')) {
                loadROM(file);
            } else {
                setStatus('仅支持 .nes 格式文件', 'error');
            }
        });

        uploadZone.addEventListener('click', (e) => {
            if (e.target !== selectFileBtn && !selectFileBtn.contains(e.target)) {
                fileInput.click();
            }
        });

        resetBtn.addEventListener('click', () => {
            if (currentROM) restartEmulator();
        });

        pauseBtn.addEventListener('click', () => togglePause());

        fullscreenBtn.addEventListener('click', () => toggleFullscreen());

        loadNewBtn.addEventListener('click', () => {
            stopEmulator();
            showUploadZone();
            fileInput.value = '';
            fileInput.click();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && screenWrapper.classList.contains('fullscreen')) {
                toggleFullscreen();
            }
            // 首次按键时初始化音频（解决 autoplay 限制）
            if (!audioCtx && isRunning) {
                initAudioContext();
                resumeAudio();
            }
        });

        document.addEventListener('click', () => {
            if (!audioCtx && isRunning) {
                initAudioContext();
                resumeAudio();
            }
        }, { once: false });
    }

    // ========================================
    // 键盘控制
    // ========================================

    function setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (!nes || !isRunning) return;

            const keyCode = e.code;
            if (keyboardMap.hasOwnProperty(keyCode)) {
                e.preventDefault();
                const nesKey = keyboardMap[keyCode];
                if (!pressedKeys.has(nesKey)) {
                    pressedKeys.add(nesKey);
                    nes.buttonDown(1, nesKey);
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (!nes || !isRunning) return;

            const keyCode = e.code;
            if (keyboardMap.hasOwnProperty(keyCode)) {
                e.preventDefault();
                const nesKey = keyboardMap[keyCode];
                pressedKeys.delete(nesKey);
                nes.buttonUp(1, nesKey);
            }
        });

        window.addEventListener('blur', () => {
            if (nes && isRunning) {
                pressedKeys.forEach(key => nes.buttonUp(1, key));
                pressedKeys.clear();
            }
        });
    }

    // ========================================
    // Gamepad 支持
    // ========================================

    function setupGamepadDetection() {
        window.addEventListener('gamepadconnected', (e) => {
            gamepadIndex = e.gamepad.index;
            gamepadHint.classList.add('visible');
            startGamepadPolling();
        });

        window.addEventListener('gamepaddisconnected', () => {
            gamepadIndex = null;
            gamepadHint.classList.remove('visible');
            stopGamepadPolling();
        });
    }

    function startGamepadPolling() {
        if (gamepadPollInterval) return;
        gamepadPollInterval = setInterval(pollGamepad, 16);
    }

    function stopGamepadPolling() {
        if (gamepadPollInterval) {
            clearInterval(gamepadPollInterval);
            gamepadPollInterval = null;
        }
    }

    function pollGamepad() {
        if (!nes || !isRunning || isPaused || gamepadIndex === null) return;

        const gamepads = navigator.getGamepads();
        const gp = gamepads[gamepadIndex];
        if (!gp) return;

        const mapping = [
            { btn: 14, key: keys.KEY_LEFT }, { btn: 15, key: keys.KEY_RIGHT },
            { btn: 13, key: keys.KEY_DOWN }, { btn: 12, key: keys.KEY_UP },
            { btn: 8, key: keys.KEY_SELECT }, { btn: 9, key: keys.KEY_START },
            { btn: 1, key: keys.KEY_B }, { btn: 0, key: keys.KEY_A }
        ];

        mapping.forEach(({ btn, key }) => {
            const pressed = gp.buttons[btn]?.pressed;
            if (pressed) {
                if (!pressedKeys.has(key)) {
                    pressedKeys.add(key);
                    nes.buttonDown(1, key);
                }
            } else {
                if (pressedKeys.has(key)) {
                    pressedKeys.delete(key);
                    nes.buttonUp(1, key);
                }
            }
        });
    }

    // ========================================
    // ROM 加载
    // ========================================

    function loadROM(file) {
        setStatus('正在加载 ROM...', 'info');
        showLoading();

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target.result;
                romBuffer = buffer;
                romString = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
                currentROM = new Uint8Array(buffer);
                hideUploadZone();
                showEmulatorContainer();
                console.log('[DEBUG] ROM loaded, buffer size:', buffer.byteLength, 'string length:', romString.length);
                initEmulator(romString, file.name);
            } catch (err) {
                setStatus('ROM 加载失败: ' + err.message, 'error');
                showUploadZone();
            }
        };

        reader.onerror = () => {
            setStatus('文件读取失败', 'error');
            showUploadZone();
        };

        reader.readAsArrayBuffer(file);
    }

    // ========================================
    // 模拟器初始化
    // ========================================

    function initEmulator(romBuffer, fileName) {
        console.log('[DEBUG] initEmulator called, string length:', romBuffer.length);
        stopEmulator();

        // 尝试初始化 AudioContext（如果之前没初始化）
        if (!audioCtx) {
            initAudioContext();
        }

        // 创建 JSNES 实例
        // JSNES v1: onAudio(l, r) 左右声道
        nes = new jsnes.NES({
            onFrame: (frameBuffer) => {
                console.log('[DEBUG] onFrame callback fired');
                updateScreen(frameBuffer);
            },
            onAudio: (l, r) => {
                onAudioSample(l, r);
            },
            onStatusUpdate: (status) => {
                setStatus(status, 'info');
            }
        });

        try {
            nes.loadROM(romBuffer);
            console.log('[DEBUG] ROM loaded successfully into NES');
            romInfo.textContent = fileName;
            setStatus('游戏已加载，按 Enter 开始', 'running');
            statusBar.classList.add('running');
            statusBar.classList.remove('paused', 'error');
            startEmulator();

            // 首次加载 ROM 后，尝试 resume audio
            setTimeout(() => {
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
            }, 100);

        } catch (err) {
            setStatus('ROM 初始化失败: ' + err.message, 'error');
            statusBar.classList.add('error');
        }
    }

    function startEmulator() {
        if (isRunning) return;
        isRunning = true;
        isPaused = false;
        pauseBtn.textContent = '暂停';
        console.log('[DEBUG] startEmulator called, isRunning:', isRunning);
        runFrame();
    }

    function stopEmulator() {
        isRunning = false;
        isPaused = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        pressedKeys.clear();
    }

    function restartEmulator() {
        if (romString) {
            initEmulator(romString, romInfo.textContent);
        }
    }

    function togglePause() {
        if (!isRunning) return;

        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '继续' : '暂停';

        if (isPaused) {
            setStatus('已暂停', 'paused');
            statusBar.classList.remove('running');
            statusBar.classList.add('paused');
        } else {
            setStatus('运行中', 'running');
            statusBar.classList.remove('paused');
            statusBar.classList.add('running');
            resumeAudio();
        }
    }

    // ========================================
    // 帧循环
    // ========================================

    function runFrame() {
        if (!isRunning) return;

        if (!isPaused && nes) {
            nes.frame();
        }

        animationFrameId = requestAnimationFrame(runFrame);
    }

    // ========================================
    // 屏幕更新
    // ========================================

    function updateScreen(frameBuffer) {
        // Debug: log first 10 pixel values to diagnose format
        if (!updateScreen._dbg) {
            updateScreen._dbg = true;
            const first10 = [];
            for (let i = 0; i < 10; i++) first10.push(frameBuffer[i] >>> 0);
            console.log('[DEBUG] updateScreen first10 pixels:', first10);
        }
        const ctx = nesScreen.getContext('2d');
        const imageData = ctx.createImageData(256, 240);

        for (let i = 0; i < 256 * 240; i++) {
            const pixel = frameBuffer[i] >>> 0;
            imageData.data[i * 4] = (pixel >> 16) & 0xFF;
            imageData.data[i * 4 + 1] = (pixel >> 8) & 0xFF;
            imageData.data[i * 4 + 2] = pixel & 0xFF;
            imageData.data[i * 4 + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // ========================================
    // 全屏
    // ========================================

    function toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (screenWrapper.requestFullscreen) {
                screenWrapper.requestFullscreen();
            } else if (screenWrapper.webkitRequestFullscreen) {
                screenWrapper.webkitRequestFullscreen();
            }
            screenWrapper.classList.add('fullscreen');
            fullscreenBtn.textContent = '退出全屏';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            screenWrapper.classList.remove('fullscreen');
            fullscreenBtn.textContent = '全屏';
        }
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            screenWrapper.classList.remove('fullscreen');
            fullscreenBtn.textContent = '全屏';
        }
    });

    document.addEventListener('webkitfullscreenchange', () => {
        if (!document.webkitFullscreenElement) {
            screenWrapper.classList.remove('fullscreen');
            fullscreenBtn.textContent = '全屏';
        }
    });

    // ========================================
    // UI 状态
    // ========================================

    function showUploadZone() {
        uploadZone.classList.remove('hidden');
        emulatorContainer.classList.add('hidden');
        statusBar.classList.add('hidden');
    }

    function hideUploadZone() {
        uploadZone.classList.add('hidden');
    }

    function showEmulatorContainer() {
        emulatorContainer.classList.remove('hidden');
        statusBar.classList.remove('hidden');
    }

    function showLoading() {}

    function setStatus(text, type) {
        statusText.textContent = text;
        statusBar.className = 'status-bar';
        if (type) statusBar.classList.add(type);
    }

    // ========================================
    // 启动
    // ========================================

    document.addEventListener('DOMContentLoaded', init);

})();
