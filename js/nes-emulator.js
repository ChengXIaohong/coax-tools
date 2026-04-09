/*
 * 小霸王游戏机 - NES 模拟器
 * 基于 JSNES v2
 * 沉浸式游戏体验版本
 */

(function() {
    'use strict';

    // DOM 元素
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const uploadArcade = document.getElementById('uploadArcade');
    const bootScreen = document.getElementById('bootScreen');
    const gameScreen = document.getElementById('gameScreen');
    const gameInfo = document.getElementById('gameInfo');
    const gameTitle = document.getElementById('gameTitle');
    const statusText = document.getElementById('statusText');
    const nesScreen = document.getElementById('nesScreen');
    const screenWrapper = document.getElementById('screenWrapper');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const loadNewBtn = document.getElementById('loadNewBtn');
    const ledPower = document.getElementById('ledPower');
    const ledActivity = document.getElementById('ledActivity');
    const virtualGamepad = document.getElementById('virtualGamepad');
    const gamepadStatus = document.getElementById('gamepadStatus');

    // 模拟器状态
    let nes = null;
    let isRunning = false;
    let isPaused = false;
    let currentROM = null;
    let romBuffer = null;
    let romString = null;
    let animationFrameId = null;

    // 可用游戏列表（随机加载）
    const availableGames = [
        '双截龙(简)[靳大治](US)[ACT].nes',
        'F1赛车(简)[Madcell](JP)[RAC].nes',
        '俄罗斯方块(简)[夜幕星辰](US)[PUZ].nes'
    ];
    let lastPlayedIndex = -1;

    // 键盘状态（必须与 jsNES 源码顺序一致！）
    // jsNES Controller.BUTTON_* 顺序: B=0, A=1, Select=2, Start=3, Up=4, Down=5, Left=6, Right=7
    const keys = {
        KEY_B: 0, KEY_A: 1, KEY_SELECT: 2, KEY_START: 3,
        KEY_UP: 4, KEY_DOWN: 5, KEY_LEFT: 6, KEY_RIGHT: 7
    };

    // ========================================
    // 键盘映射（游戏行业标准）
    // ========================================
    // 方向键 + WASD 双支持
    // P = 暂停（独立快捷键，不占方向位）
    // R = 重置
    // F / Escape = 全屏
    // ========================================
    const keyboardMap = {
        // 方向键（主）+ WASD（备选，均为方向键）
        'ArrowLeft': keys.KEY_LEFT, 'ArrowRight': keys.KEY_RIGHT,
        'ArrowDown': keys.KEY_DOWN, 'ArrowUp': keys.KEY_UP,
        'KeyA': keys.KEY_LEFT, 'KeyD': keys.KEY_RIGHT,
        'KeyS': keys.KEY_DOWN, 'KeyW': keys.KEY_UP,
        // NES 按钮：Z=B按钮(刹车/跳跃), X=A按钮(加速/攻击)
        // Shift=Select, Enter=Start
        'KeyZ': keys.KEY_B, 'KeyX': keys.KEY_A,
        'Enter': keys.KEY_START, 'ShiftLeft': keys.KEY_SELECT, 'ShiftRight': keys.KEY_SELECT,
    };

    // 独立功能快捷键（不受 game running 状态限制）
    const hotkeys = {
        'KeyP': 'pause',      // 暂停
        'KeyR': 'reset',      // 重置
        'KeyF': 'fullscreen', // 全屏
        'Escape': 'fullscreen' // ESC 退出全屏
    };

    const pressedKeys = new Set();

    // Web Audio
    let audioCtx = null;
    let audioQueue = [];
    let audioProcessor = null;
    const QUEUE_LIMIT = 48000;

    // Gamepad
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
            console.log('AudioContext 初始化成功');
        } catch(e) {
            console.warn('AudioContext 创建失败:', e);
            audioCtx = null;
        }
    }

    function createAudioGraph() {
        if (!audioCtx) return;
        // ScriptProcessorNode 已 deprecated 但功能正常，message channel 错误已通过绕过 onFrame 回调修复
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

    function onAudioSample(l, r) {
        if (!audioCtx) return;
        if (audioQueue.length < QUEUE_LIMIT) {
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
        setupVirtualGamepad();
    }

    // ========================================
    // ========================================
    // 事件监听
    // ========================================

    let cancelPollInterval = null;
    let cancelPollTimeout = null;

    function handleFileCancel() {
        loadRandomGame();
    }

    function startCancelPoll() {
        stopCancelPoll();
        let lastFileCount = fileInput.files.length;
        let stableCount = 0;

        cancelPollInterval = setInterval(() => {
            const currentCount = fileInput.files.length;
            if (currentCount === lastFileCount) {
                stableCount++;
            } else {
                stableCount = 0;
                lastFileCount = currentCount;
            }
            // 连续 3 次检测到相同值 = 对话框已关闭
            if (stableCount >= 3) {
                stopCancelPoll();
                if (currentCount === 0) {
                    handleFileCancel();
                }
            }
        }, 100);

        cancelPollTimeout = setTimeout(() => { stopCancelPoll(); }, 30000);
    }

    function stopCancelPoll() {
        if (cancelPollInterval) { clearInterval(cancelPollInterval); cancelPollInterval = null; }
        if (cancelPollTimeout) { clearTimeout(cancelPollTimeout); cancelPollTimeout = null; }
    }

    function setupEventListeners() {
        // 文件选择取消检测：点击 fileInput 后轮询检测对话框关闭
        fileInput.addEventListener('click', () => {
            // 延迟启动轮询，确保对话框已打开
            setTimeout(startCancelPoll, 50);
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                stopCancelPoll();
                loadROM(file);
            }
        });

        // 拖放上传
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
            }
        });

        // 操作按钮
        resetBtn.addEventListener('click', () => {
            if (currentROM) restartEmulator();
        });

        pauseBtn.addEventListener('click', () => togglePause());

        fullscreenBtn.addEventListener('click', () => toggleFullscreen());

        loadNewBtn.addEventListener('click', () => {
            stopEmulator();
            showUploadZone();
            fileInput.value = '';
        });

        // 首次点击初始化音频（备用，确保 autoplay 策略绕过）
        document.addEventListener('click', () => {
            if (!audioCtx && isRunning) {
                initAudioContext();
                resumeAudio();
            }
        }, { once: false });
    }

    // ========================================
    // 键盘控制（统一入口）
    // ========================================

    function setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            const keyCode = e.code;
            console.log('[KEYDOWN] code:', keyCode, 'key:', e.key, 'hotkeys:', hotkeys.hasOwnProperty(keyCode), 'keyboardMap:', keyboardMap.hasOwnProperty(keyCode));

            // 始终阻止浏览器默认行为（防止方向键页面滚动）
            if (keyboardMap.hasOwnProperty(keyCode) || hotkeys.hasOwnProperty(keyCode)) {
                e.preventDefault();
            }

            // 独立功能键
            if (hotkeys.hasOwnProperty(keyCode)) {
                handleHotkey(hotkeys[keyCode]);
                return;
            }

            // 方向/按钮键（需要游戏运行）
            if (!nes || !isRunning) return;

            if (keyboardMap.hasOwnProperty(keyCode)) {
                const nesKey = keyboardMap[keyCode];
                if (!pressedKeys.has(nesKey)) {
                    pressedKeys.add(nesKey);
                    nes.buttonDown(1, nesKey);
                    console.log('[KEY] pressed:', keyCode, '-> nesKey:', nesKey);
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
    // 功能快捷键处理
    // ========================================

    function handleHotkey(action) {
        switch (action) {
            case 'pause':
                if (isRunning) togglePause();
                break;
            case 'reset':
                if (currentROM) restartEmulator();
                break;
            case 'fullscreen':
                toggleFullscreen();
                break;
        }
    }

    // ========================================
    // Gamepad 支持
    // ========================================

    function setupGamepadDetection() {
        window.addEventListener('gamepadconnected', (e) => {
            gamepadIndex = e.gamepad.index;
            gamepadStatus.classList.remove('hidden');
            startGamepadPolling();
        });

        window.addEventListener('gamepaddisconnected', () => {
            gamepadIndex = null;
            gamepadStatus.classList.add('hidden');
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
    // 虚拟手柄 (触屏设备)
    // ========================================

    function setupVirtualGamepad() {
        const dpadKeys = {
            'up': keys.KEY_UP,
            'down': keys.KEY_DOWN,
            'left': keys.KEY_LEFT,
            'right': keys.KEY_RIGHT
        };

        const btnKeys = {
            'a': keys.KEY_A,
            'b': keys.KEY_B
        };

        const sysKeys = {
            'select': keys.KEY_SELECT,
            'start': keys.KEY_START
        };

        // 方向键
        document.querySelectorAll('.dpad-up, .dpad-down, .dpad-left, .dpad-right').forEach(btn => {
            const key = btn.dataset.key;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!nes || !isRunning) return;
                const nesKey = dpadKeys[key];
                pressedKeys.add(nesKey);
                nes.buttonDown(1, nesKey);
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (!nes || !isRunning) return;
                const nesKey = dpadKeys[key];
                pressedKeys.delete(nesKey);
                nes.buttonUp(1, nesKey);
            }, { passive: false });
        });

        // A/B 键
        document.querySelectorAll('.face-btn').forEach(btn => {
            const key = btn.dataset.key;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!nes || !isRunning) return;
                const nesKey = btnKeys[key];
                pressedKeys.add(nesKey);
                nes.buttonDown(1, nesKey);
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (!nes || !isRunning) return;
                const nesKey = btnKeys[key];
                pressedKeys.delete(nesKey);
                nes.buttonUp(1, nesKey);
            }, { passive: false });
        });

        // 系统键
        document.querySelectorAll('.sys-btn').forEach(btn => {
            const key = btn.dataset.key;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!nes || !isRunning) return;
                const nesKey = sysKeys[key];
                pressedKeys.add(nesKey);
                nes.buttonDown(1, nesKey);
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (!nes || !isRunning) return;
                const nesKey = sysKeys[key];
                pressedKeys.delete(nesKey);
                nes.buttonUp(1, nesKey);
            }, { passive: false });
        });
    }

    // ========================================
    // ROM 加载
    // ========================================

    function loadROM(file) {
        showBootScreen();

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target.result;
                romBuffer = buffer;
                // JSNES v1 loadROM 接收 string，每个 charCodeAt(i) 代表一个 byte
                // 必须用 String.fromCharCode，不能用 TextDecoder（ROM 是二进制不是 UTF-8）
                const uint8 = new Uint8Array(buffer);
                romString = String.fromCharCode.apply(null, uint8);
                currentROM = uint8;

                console.log('[DEBUG] ROM loaded, size:', buffer.byteLength, 'first bytes:', romString.charCodeAt(0).toString(16), romString.charCodeAt(1).toString(16), romString.charCodeAt(2).toString(16), romString.charCodeAt(3).toString(16));

                // 启动动画后进入游戏
                setTimeout(() => {
                    initEmulator(romString, file.name);
                }, 2000);

            } catch (err) {
                console.error('[ERROR] ROM load error:', err);
                showUploadZone();
            }
        };

        reader.onerror = () => {
            console.error('[ERROR] FileReader error');
            showUploadZone();
        };

        reader.readAsArrayBuffer(file);
    }

    // ========================================
    // 模拟器初始化
    // ========================================

    function initEmulator(romBuffer, fileName) {
        stopEmulator();

        if (!audioCtx) {
            initAudioContext();
        }

        nes = new jsnes.NES({
            // 必须传函数，不能传 null！JSNES 内部: ui.writeFrame = opts.onFrame
            // PPU endFrame → this.nes.ui.writeFrame(buffer) = this.opts.onFrame(buffer)
            // 屏幕更新改用 runFrame 同步读取 nes.ppu.frameBuffer
            onFrame: function() {},
            onAudio: (l, r) => {
                onAudioSample(l, r);
            },
            onStatusUpdate: (status) => {
                setStatus(status);
            }
        });

        try {
            // 验证 ROM header
            const headerCheck = romString.substring(0, 4);
            console.log('[DEBUG] ROM header:', JSON.stringify(headerCheck), 'charCodes:', headerCheck.charCodeAt(0).toString(16), headerCheck.charCodeAt(1).toString(16), headerCheck.charCodeAt(2).toString(16), headerCheck.charCodeAt(3).toString(16));
            nes.loadROM(romString);
            showGameScreen();
            gameTitle.textContent = fileName.replace('.nes', '');
            setStatus('运行中');
            ledPower.setAttribute('data-on', 'true');

            // 激活 activity LED
            ledActivity.style.animation = 'activityPulse 0.5s ease-in-out infinite';

            startEmulator();

            setTimeout(() => {
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
            }, 100);

        } catch (err) {
            console.error('[ERROR] initEmulator error:', err);
            setStatus('加载失败: ' + err.message);
            showUploadZone();
        }
    }

    function startEmulator() {
        if (isRunning) return;
        isRunning = true;
        isPaused = false;
        updatePauseButton();
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
        ledPower.setAttribute('data-on', 'false');
        ledActivity.style.animation = '';
    }

    function restartEmulator() {
        if (romString) {
            initEmulator(romString, gameTitle.textContent + '.nes');
        }
    }

    function togglePause() {
        if (!isRunning) return;

        isPaused = !isPaused;
        updatePauseButton();

        if (isPaused) {
            setStatus('已暂停');
            ledActivity.style.animation = 'none';
        } else {
            setStatus('运行中');
            ledActivity.style.animation = 'activityPulse 0.5s ease-in-out infinite';
            resumeAudio();
        }
    }

    function updatePauseButton() {
        if (isPaused) {
            pauseBtn.classList.remove('playing');
            pauseBtn.querySelector('.btn-label').textContent = '继续';
        } else {
            pauseBtn.classList.add('playing');
            pauseBtn.querySelector('.btn-label').textContent = '暂停';
        }
    }

    // ========================================
    // 帧循环
    // ========================================

    function runFrame() {
        if (!isRunning) return;

        if (!isPaused && nes) {
            nes.frame();
            // 直接从 PPU.buffer 同步读取像素，避免 onFrame 回调的 worker message channel 错误
            // jsNES 源码确认：PPU.buffer = new Array(256 * 240)
            updateScreen(nes.ppu.buffer);
        }

        animationFrameId = requestAnimationFrame(runFrame);
    }

    // ========================================
    // 屏幕更新
    // ========================================

    function updateScreen(frameBuffer) {
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
            fullscreenBtn.querySelector('.btn-label').textContent = '退出';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            screenWrapper.classList.remove('fullscreen');
            fullscreenBtn.querySelector('.btn-label').textContent = '全屏';
        }
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            screenWrapper.classList.remove('fullscreen');
            fullscreenBtn.querySelector('.btn-label').textContent = '全屏';
        }
    });

    document.addEventListener('webkitfullscreenchange', () => {
        if (!document.webkitFullscreenElement) {
            screenWrapper.classList.remove('fullscreen');
            fullscreenBtn.querySelector('.btn-label').textContent = '全屏';
        }
    });

    // ========================================
    // UI 状态
    // ========================================

    function showUploadZone() {
        uploadArcade.classList.remove('hidden');
        bootScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');
        gameInfo.classList.add('hidden');
    }

    function showBootScreen() {
        uploadArcade.classList.add('hidden');
        bootScreen.classList.remove('hidden');
        gameScreen.classList.add('hidden');
        gameInfo.classList.add('hidden');
    }

    function showGameScreen() {
        uploadArcade.classList.add('hidden');
        bootScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        gameInfo.classList.remove('hidden');
    }

    function setStatus(text) {
        statusText.textContent = text;
    }

    // ========================================
    // 启动
    // ========================================

    document.addEventListener('DOMContentLoaded', init);


    // ========================================
    // 随机加载游戏
    // ========================================

    function loadRandomGame() {
        // 随机选择游戏（避免连续两次相同）
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * availableGames.length);
        } while (randomIndex === lastPlayedIndex && availableGames.length > 1);

        lastPlayedIndex = randomIndex;
        const gameFile = availableGames[randomIndex];
        const gameName = gameFile.replace('.nes', '');

        // 显示 slot machine 动画
        slotMachineRoll(gameName);
    }

    function slotMachineRoll(finalGameName) {
        const overlay = document.getElementById('slotMachineOverlay');
        const reel = document.getElementById('slotReel');
        if (!overlay || !reel) return;

        // 随机显示游戏名营造滚动效果
        const iterations = 15;
        let count = 0;
        const rollInterval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * availableGames.length);
            reel.textContent = availableGames[randomIndex].replace('.nes', '');
            count++;
            if (count >= iterations) {
                clearInterval(rollInterval);
                reel.textContent = finalGameName;
            }
        }, 80);

        // 显示 overlay
        overlay.classList.remove('hidden');

        // 1.5秒后停止动画并加载游戏
        setTimeout(() => {
            slotMachineStop(finalGameName);
        }, 1500);
    }

    function slotMachineStop(gameFile) {
        const overlay = document.getElementById('slotMachineOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }

        // fetch 加载 ROM
        // 确保文件名干净，不重复追加 .nes
        const cleanName = gameFile.endsWith('.nes') ? gameFile : gameFile + '.nes';
        const url = '../webdata/nes/' + cleanName;
        showBootScreen();

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.arrayBuffer();
            })
            .then(buffer => {
                loadROMFromBuffer(buffer, gameFile);
            })
            .catch(err => {
                console.error('[ERROR] Failed to load random game:', err);
                showUploadZone();
            });
    }

    function loadROMFromBuffer(buffer, fileName) {
        try {
            romBuffer = buffer;
            const uint8 = new Uint8Array(buffer);
            romString = String.fromCharCode.apply(null, uint8);
            currentROM = uint8;

            console.log('[DEBUG] Random ROM loaded, size:', buffer.byteLength, 'file:', fileName);

            // 启动动画后进入游戏（复用现有的 2 秒启动动画）
            setTimeout(() => {
                initEmulator(romString, fileName);
            }, 2000);

        } catch (err) {
            console.error('[ERROR] ROM buffer processing error:', err);
            showUploadZone();
        }
    }


})();
