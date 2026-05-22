/**
 * GPU Benchmark Tool v2.0
 * 全屏沉浸式自动基准测试 - 粒子爆炸 | 矩阵雨 | 粒子地球
 */

/* ======================= 主控制器 ======================= */
class GPUBenchmark {
    constructor() {
        this.gl = null;
        this.canvas = null;
        this.fpsCtx = null;
        this.debugInfo = null;
        this.isRunning = false;
        this.isFullscreen = false;
        this.animationId = null;
        this.sceneInstance = null;
        this.gpuInfo = null;

        this._fxCtx = null;

        // v2.0: 多场景结果
        this.sceneResults = [];  // [{scene, avgFPS, minFPS, score}, ...]
        this.currentSceneIdx = 0;
        this.allScenes = [
            { id: 'tunnel', label: '🌀 超空间隧道', icon: '🌀' },
            { id: 'galaxy', label: '🌌 星云绽放',   icon: '🌌' },
            { id: 'earth',  label: '🌍 地球降临',    icon: '🌍' }
        ];
    }

    /* GPU 信息检测 */
    detectGPUInfo() {
        const c = document.createElement('canvas');
        this.gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!this.gl) return { vendor: '未知', renderer: '不支持', version: '-', maxTextureSize: '-' };

        this.debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
        let vendor = '未知', renderer = '未知';
        if (this.debugInfo) {
            vendor = this.gl.getParameter(this.debugInfo.UNMASKED_VENDOR_WEBGL) || '未知';
            renderer = this.gl.getParameter(this.debugInfo.UNMASKED_RENDERER_WEBGL) || '未知';
        } else {
            vendor = this.gl.getParameter(this.gl.VENDOR) || '未知';
            renderer = this.gl.getParameter(this.gl.RENDERER) || '未知';
        }
        const version = this.gl.getParameter(this.gl.VERSION) || '-';
        const maxTex = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) || '-';
        this.gpuInfo = { vendor, renderer, version, maxTextureSize: maxTex };
        return this.gpuInfo;
    }

    checkExtensions() {
        return this.gl ? (this.gl.getSupportedExtensions() || []) : [];
    }

    /* ===== v2.0: 全屏自动测试 ===== */
    async startFullBenchmark() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.sceneResults = [];
        this.currentSceneIdx = 0;

        // 进入全屏
        try {
            await document.documentElement.requestFullscreen();
            this.isFullscreen = true;
        } catch (e) {
            // 用户取消全屏则不开始
            this.isRunning = false;
            return;
        }

        document.body.style.overflow = 'hidden';

        // 隐藏普通UI，显示全屏画布
        const normalUI = document.getElementById('normalUI');
        if (normalUI) normalUI.style.display = 'none';

        const fsCanvas = document.getElementById('fsCanvas');
        const hud = document.getElementById('fsHUD');
        fsCanvas.style.display = 'block';
        hud.style.display = 'flex';

        fsCanvas.width = window.innerWidth;
        fsCanvas.height = window.innerHeight;

        // PostFX overlay canvas
        const fxOverlay = document.createElement('canvas');
        fxOverlay.id = 'fxOverlay';
        fxOverlay.width = window.innerWidth;
        fxOverlay.height = window.innerHeight;
        Object.assign(fxOverlay.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100%', height: '100%',
            zIndex: '150', pointerEvents: 'none'
        });
        document.body.appendChild(fxOverlay);
        this._fxCtx = fxOverlay.getContext('2d');

        // ESC 退出监听
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.isRunning) {
                this.abortBenchmark();
            }
        });

        // 逐场景跑
        for (let i = 0; i < this.allScenes.length; i++) {
            if (!this.isRunning) break;
            this.currentSceneIdx = i;
            const scene = this.allScenes[i];

            // 场景切换闪光
            await this.flashTransition();

            // 更新 HUD
            this.updateHUD(scene, 0, 0, 0);

            const result = await this.runScene(scene.id, fsCanvas, hud);
            if (result) this.sceneResults.push(result);
        }

        if (this.isRunning) {
            await this.showFinalResults();
        }

        this.exitFullscreen();
    }

    abortBenchmark() {
        this.isRunning = false;
        if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
        if (this.sceneInstance) { this.sceneInstance.stop(); }
        this.exitFullscreen();
    }

    exitFullscreen() {
        this.isRunning = false;
        this.isFullscreen = false;
        document.body.style.overflow = '';

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }

        // Remove PostFX overlay
        const fxOverlay = document.getElementById('fxOverlay');
        if (fxOverlay) fxOverlay.remove();
        this._fxCtx = null;

        const fsCanvas = document.getElementById('fsCanvas');
        const hud = document.getElementById('fsHUD');
        const normalUI = document.getElementById('normalUI');
        if (fsCanvas) fsCanvas.style.display = 'none';
        if (hud) hud.style.display = 'none';
        if (normalUI) normalUI.style.display = 'block';

        // 重置开始按钮
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = '🚀 开始基准测试'; }
        if (resetBtn) resetBtn.disabled = true;
    }

    /* 单场景测试 */
    runScene(sceneId, canvas, hud) {
        return new Promise((resolve) => {
            // All scenes use WebGL now — no 2D context creation (would lock canvas type)
            const W = canvas.width, H = canvas.height;

            // Clean up previous scene
            if (this.sceneInstance) { this.sceneInstance.stop(); this.sceneInstance = null; }

            switch (sceneId) {
                case 'tunnel': this.sceneInstance = new HyperTunnelScene(canvas, W, H); break;
                case 'galaxy': this.sceneInstance = new NebulaBloomScene(canvas, W, H); break;
                case 'earth':  this.sceneInstance = new ParticleEarthScene(canvas, W, H); break;
            }

            const fpsHistory = [];
            let startTime = performance.now();
            let lastTime = startTime;
            let warmupDone = false;
            let flashDone = false;
            let elapsed = 0;
            const DURATION = 5000;

            const loop = (now) => {
                if (!this.isRunning) { resolve(null); return; }

                const frameTime = now - lastTime;
                lastTime = now;
                elapsed = now - startTime;

                // 预热 1s
                if (!warmupDone) {
                    try {
                        this.sceneInstance.update(frameTime);
                        this.sceneInstance.draw();
                    } catch (e) {
                    }
                    if (elapsed >= 1000) { warmupDone = true; startTime = now; fpsHistory.length = 0; }
                    this.animationId = requestAnimationFrame(loop);
                    return;
                }

                const testElapsed = now - startTime;
                const progress = Math.min(testElapsed / DURATION, 1);

                // FPS 采集
                const fps = 1000 / frameTime;
                if (fps < 300) fpsHistory.push(fps);

                // 更新场景
                try {
                    this.sceneInstance.update(frameTime);
                    this.sceneInstance.draw();
                } catch (e) {
                }
                this._applyPostFX(canvas);

                // 更新 HUD
                const avgFPS = fpsHistory.length > 0 ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length) : 0;
                const minFPS = fpsHistory.length > 0 ? Math.round(Math.min(...fpsHistory)) : 0;
                this.updateHUD(this.allScenes[this.currentSceneIdx], progress, avgFPS, minFPS);

                if (testElapsed >= DURATION) {
                    cancelAnimationFrame(this.animationId);
                    const finalAvg = fpsHistory.length > 0 ? fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length : 0;
                    const finalMin = fpsHistory.length > 0 ? Math.min(...fpsHistory) : 0;
                    const score = this.fpsToScore(finalAvg);
                    resolve({ scene: sceneId, avgFPS: Math.round(finalAvg), minFPS: Math.round(finalMin), score });
                } else {
                    this.animationId = requestAnimationFrame(loop);
                }
            };

            this.animationId = requestAnimationFrame(loop);
        });
    }

    fpsToScore(avgFPS) {
        if (avgFPS >= 144) return 50;
        if (avgFPS >= 120) return 45 + (avgFPS - 120) / 24 * 4;
        if (avgFPS >= 60)  return 30 + (avgFPS - 60) / 60 * 15;
        if (avgFPS >= 30)  return 10 + (avgFPS - 30) / 30 * 20;
        return Math.max(0, avgFPS / 30 * 10);
    }

    /* HUD 更新 */
    updateHUD(scene, progress, avgFPS, minFPS) {
        const hud = document.getElementById('fsHUD');
        if (!hud) return;
        const phase = this.currentSceneIdx + 1;
        const total = this.allScenes.length;
        hud.innerHTML = `
            <div class="hud-left">
                <div class="hud-scene-name">${scene.icon} ${scene.label.replace(/^[^\s]+\s/, '')}</div>
                <div class="hud-progress-bar"><div class="hud-progress-fill" style="width:${progress*100}%"></div></div>
                <div class="hud-progress-text">${Math.round(progress * 100)}%</div>
            </div>
            <div class="hud-center">
                <div class="hud-phase">阶段 ${phase} / ${total}</div>
            </div>
            <div class="hud-right">
                <div class="hud-fps-label">FPS</div>
                <div class="hud-fps-value">${avgFPS || '-'}</div>
                <div class="hud-fps-min">最低 ${minFPS || '-'}</div>
            </div>`;
    }

    /* 场景切换闪光 (cinematic) */
    flashTransition() {
        return new Promise((resolve) => {
            const flash = document.getElementById('sceneFlash');
            if (!flash) { resolve(); return; }
            // Fix: override display:none from CSS
            flash.style.display = 'block';
            flash.style.background = '#fff';
            flash.style.transform = 'scale(1)';
            flash.style.opacity = '1';
            flash.style.transition = 'none';
            requestAnimationFrame(() => {
                flash.style.transition = 'opacity 0.25s ease-out, transform 0.4s ease-out';
                flash.style.opacity = '0.7';
                flash.style.transform = 'scale(1.3)';
                setTimeout(() => {
                    flash.style.transition = 'opacity 0.3s ease-out';
                    flash.style.opacity = '0';
                    setTimeout(() => {
                        flash.style.display = 'none';
                        resolve();
                    }, 350);
                }, 200);
            });
        });
    }

    /* ===== Post-Processing Effects v3 (dynamic with bloom) ===== */
    _applyPostFX(srcCanvas) {
        const ctx = this._fxCtx;
        if (!ctx) { return; }
        const W = ctx.canvas.width, H = ctx.canvas.height;

        ctx.clearRect(0, 0, W, H);

        // Get current scene speed for dynamic effect intensity
        const speed = (this.sceneInstance && this.sceneInstance._speed) || 1.0;
        const intensity = Math.min(speed / 2.0, 1.5);
        const isTunnel = this.sceneInstance && this.sceneInstance.constructor.name === 'HyperTunnelScene';

        // === Main pass: original ===
        ctx.drawImage(srcCanvas, 0, 0);

        // === Bloom: blur + screen composite (tunnel scene) ===
        if (isTunnel) {
            const bloomIntensity = 0.25 + intensity * 0.2;
            ctx.globalCompositeOperation = 'screen';
            ctx.filter = 'blur(6px)';
            ctx.globalAlpha = bloomIntensity * 0.5;
            ctx.drawImage(srcCanvas, 0, 0);
            ctx.filter = 'blur(12px)';
            ctx.globalAlpha = bloomIntensity * 0.35;
            ctx.drawImage(srcCanvas, 0, 0);
            ctx.filter = 'none';
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }

        // === Chromatic aberration: R/G/B separation ===
        const caOffset = isTunnel ? 1.5 : 1.0 + intensity * 3.0;
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = isTunnel ? 0.12 : (0.25 + intensity * 0.08);
        ctx.drawImage(srcCanvas, caOffset, 0);
        ctx.globalAlpha = isTunnel ? 0.12 : (0.25 + intensity * 0.08);
        ctx.drawImage(srcCanvas, -caOffset, 0);
        ctx.globalAlpha = isTunnel ? 0.15 : (0.3 + intensity * 0.1);
        ctx.drawImage(srcCanvas, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        // === Radial blur ===
        if (intensity > 0.5) {
            const blurAmt = Math.min((intensity - 0.5) * 4.0, 0.08);
            ctx.globalAlpha = blurAmt;
            for (let i = 0; i < 3; i++) {
                const off = (i + 1) * 6 * intensity;
                ctx.drawImage(srcCanvas, off, 0);
                ctx.drawImage(srcCanvas, -off, 0);
                ctx.drawImage(srcCanvas, 0, off);
                ctx.drawImage(srcCanvas, 0, -off);
            }
            ctx.globalAlpha = 1;
            const cx = W / 2, cy = H / 2;
            ctx.drawImage(srcCanvas, cx - W * 0.25, cy - H * 0.25, W * 0.5, H * 0.5,
                                    cx - W * 0.25, cy - H * 0.25, W * 0.5, H * 0.5);
        }

        // === Film grain ===
        let grainCanvas = document.getElementById('_grainCanvas');
        let grainCtx;
        if (grainCanvas) {
            grainCtx = grainCanvas.getContext('2d');
        } else {
            grainCanvas = document.createElement('canvas');
            grainCanvas.id = '_grainCanvas';
            grainCanvas.width = 128; grainCanvas.height = 128;
            grainCanvas.style.display = 'none';
            document.body.appendChild(grainCanvas);
            grainCtx = grainCanvas.getContext('2d');
        }
        const grainData = grainCtx.createImageData(128, 128);
        for (let i = 0; i < grainData.data.length; i += 4) {
            const v = Math.random() * 255;
            grainData.data[i] = v;
            grainData.data[i + 1] = v;
            grainData.data[i + 2] = v;
            grainData.data[i + 3] = 20 + Math.random() * 15;
        }
        grainCtx.putImageData(grainData, 0, 0);
        ctx.globalAlpha = 0.12 + intensity * 0.08;
        ctx.drawImage(grainCanvas, 0, 0, W, H);
        ctx.globalAlpha = 1;

        // === Vignette ===
        const vigRadius = H * (0.15 + intensity * 0.08);
        const vigOuter = H * (0.7 + intensity * 0.1);
        const vig = ctx.createRadialGradient(W / 2, H / 2, vigRadius, W / 2, H / 2, vigOuter);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,0,' + (0.35 + intensity * 0.15) + ')');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }

    /* ===== 最终结果展示 ===== */
    async showFinalResults() {
        const hud = document.getElementById('fsHUD');
        const resultPanel = document.getElementById('fsResultPanel');
        if (!resultPanel) return;

        // 计算综合分
        const totalScore = this.sceneResults.length > 0
            ? Math.round(this.sceneResults.reduce((s, r) => s + r.score, 0) / this.sceneResults.length)
            : 0;
        const avgFPS = this.sceneResults.length > 0
            ? Math.round(this.sceneResults.reduce((s, r) => s + r.avgFPS, 0) / this.sceneResults.length)
            : 0;

        let grade, label, gradeColor;
        if (totalScore >= 90) { grade = 'S+'; label = '旗舰级显卡'; gradeColor = '#ffd700'; }
        else if (totalScore >= 75) { grade = 'A'; label = '性能级显卡'; gradeColor = '#a78bfa'; }
        else if (totalScore >= 50) { grade = 'B'; label = '主流级显卡'; gradeColor = '#60a5fa'; }
        else { grade = 'C'; label = '入门级显卡'; gradeColor = '#888'; }

        // 显示结果面板
        hud.style.display = 'none';
        resultPanel.style.display = 'flex';
        resultPanel.style.flexDirection = 'column';
        resultPanel.style.alignItems = 'center';
        resultPanel.style.justifyContent = 'center';

        const sceneLabels = { tunnel: '🌀 超空间隧道', galaxy: '🌌 星云绽放', earth: '🌍 地球降临' };

        let html = '<div class="fs-result-inner">';
        html += '<div class="fs-grade" id="fsGrade" style="color:' + gradeColor + ';opacity:0;transform:scale(0.5)">' + grade + '</div>';
        html += '<div class="fs-grade-label" id="fsGradeLabel" style="opacity:0">' + label + '</div>';
        html += '<div class="fs-score-counter" id="fsScoreCounter">0</div>';
        html += '<div class="fs-divider"></div>';
        html += '<div class="fs-scene-results">';
        for (const r of this.sceneResults) {
            html += '<div class="fs-scene-row" id="fsRow_' + r.scene + '">' +
                '<span class="fs-scene-icon">' + (sceneLabels[r.scene] || r.scene) + '</span>' +
                '<span class="fs-scene-fps">' + r.avgFPS + ' FPS</span>' +
                '<div class="fs-scene-bar"><div class="fs-scene-fill" data-score="' + (r.score / 50 * 100) + '"></div></div>' +
                '<span class="fs-scene-score">' + Math.round(r.score) + '分</span></div>';
        }
        html += '</div>';
        html += '<button class="fs-copy-btn" id="fsCopyBtn">📋 复制结果</button>';
        html += '<div class="fs-exit-hint">按 ESC 或点击任意处退出</div>';
        html += '</div>';
        resultPanel.innerHTML = html;

        // 动画序列
        await this.delay(100);
        const gradeEl = document.getElementById('fsGrade');
        gradeEl.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        gradeEl.style.opacity = '1';
        gradeEl.style.transform = 'scale(1)';

        await this.delay(300);
        const labelEl = document.getElementById('fsGradeLabel');
        labelEl.style.transition = 'opacity 0.4s ease-out';
        labelEl.style.opacity = '1';

        // 分数跳动
        await this.delay(400);
        await this.animateCounter(document.getElementById('fsScoreCounter'), 0, totalScore, 1000);

        // 逐行亮起场景结果
        await this.delay(200);
        for (const r of this.sceneResults) {
            const row = document.getElementById('fsRow_' + r.scene);
            if (!row) continue;
            row.style.opacity = '1';
            row.style.transition = 'opacity 0.3s ease-out';
            const fill = row.querySelector('.fs-scene-fill');
            if (fill) {
                const targetW = fill.dataset.score;
                fill.style.transition = 'width 0.6s ease-out';
                fill.style.width = targetW + '%';
            }
            await this.delay(200);
        }

        // 复制按钮
        await this.delay(300);
        const copyBtn = document.getElementById('fsCopyBtn');
        if (copyBtn) {
            copyBtn.style.opacity = '1';
            copyBtn.addEventListener('click', () => {
                const data = {
                    tool: 'GPU Benchmark v2.0',
                    date: new Date().toISOString().split('T')[0],
                    gpu: this.gpuInfo,
                    score: { total: totalScore, grade, label },
                    scenes: this.sceneResults.map(r => ({ scene: r.scene, avgFPS: r.avgFPS, minFPS: r.minFPS, score: Math.round(r.score) }))
                };
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                copyBtn.textContent = '✅ 已复制!';
                setTimeout(() => copyBtn.textContent = '📋 复制结果', 2000);
            });
        }

        // 点击任意处退出（延迟防误触）
        setTimeout(() => {
            document.addEventListener('click', () => this.exitFullscreen(), { once: true });
        }, 1000);
    }

    animateCounter(el, from, to, duration) {
        return new Promise((resolve) => {
            const start = performance.now();
            const tick = (now) => {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(from + (to - from) * eased);
                if (p < 1) requestAnimationFrame(tick);
                else resolve();
            };
            requestAnimationFrame(tick);
        });
    }

    delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

/* ======================= 场景 1: 超空间隧道 v3 (体积光追 + 粒子系统) ======================= */
class HyperTunnelScene {
    constructor(canvas, w, h) {
        this.canvas = canvas;
        this.W = w;
        this.H = h;
        this.time = 0;
        this.gl = null;
        this.tunnelProg = null;
        this.particleProg = null;
        this.quadBuf = null;
        this.particleBuf = null;
        this.particleCount = 5000;
        this.trailLength = 6;
        this.renderParticleCount = 0;

        // Mouse / camera
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.camAngleH = 0;
        this.camAngleV = 0.3;
        this.camDist = 2.5;
        this.targetCamAngleH = 0;
        this.targetCamAngleV = 0.3;
        this.targetCamDist = 2.5;
        this.autoRotate = true;
        this._rotateTimeout = null;

        // FPS tracking
        this._fpsHistory = [];
        this._lastFPSTime = 0;
        this._fpsEl = null;
        this._fpsPanel = null;
        this._fpsFrameCount = 0;

        this._speed = 1.0;

        this._initGL();
        this._initMouseControls();
        this._initFPSMonitor();
    }

    /* ---- Matrix helpers ---- */
    _mat4Perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0
        ]);
    }
    _mat4LookAt(eye, center, up) {
        const zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
        let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
        const z = [zx / len, zy / len, zz / len];
        const xx = up[1] * z[2] - up[2] * z[1], xy = up[2] * z[0] - up[0] * z[2], xz = up[0] * z[1] - up[1] * z[0];
        len = Math.sqrt(xx * xx + xy * xy + xz * xz);
        const x = [xx / len, xy / len, xz / len];
        const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
        return new Float32Array([
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
            -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
            -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
            1
        ]);
    }
    _mat4Multiply(a, b) {
        const o = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                o[j * 4 + i] = a[i] * b[j * 4] + a[i + 4] * b[j * 4 + 1] + a[i + 8] * b[j * 4 + 2] + a[i + 12] * b[j * 4 + 3];
            }
        }
        return o;
    }

    /* ---- WebGL init ---- */
    _initGL() {
        const gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true })
            || this.canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
        if (!gl) return;
        this.gl = gl;

        function compileShader(type, src) {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.warn('Tunnel shader compile:', gl.getShaderInfoLog(sh));
                gl.deleteShader(sh);
                return null;
            }
            return sh;
        }

        /* ---- Fullscreen quad (passthrough for ray-marched tunnel) ---- */
        const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const qbuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, qbuf);
        gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
        this.quadBuf = qbuf;

        /* ---- Tunnel vertex shader (passthrough) ---- */
        const tunnelVS = `
            attribute vec2 aPos;
            varying vec2 vUV;
            void main() {
                vUV = aPos * 0.5 + 0.5;
                gl_Position = vec4(aPos, 0.0, 1.0);
            }
        `;

        /* ---- Tunnel fragment shader — Ray-marched volume rendering ---- */
        const tunnelFS = `
            precision highp float;
            varying vec2 vUV;
            uniform float uTime;
            uniform float uCamAngleH;
            uniform float uCamAngleV;
            uniform float uCamDist;
            uniform vec2 uRes;

            vec3 rotX(vec3 p, float a) {
                float s = sin(a), c = cos(a);
                return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
            }
            vec3 rotY(vec3 p, float a) {
                float s = sin(a), c = cos(a);
                return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
            }

            // Poison-mushroom-style iterative coordinate warp
            vec3 warp(vec3 p, float t) {
                for (int i = 0; i < 5; i++) {
                    float fi = float(i);
                    p = vec3(
                        atan(p.y + cos(t * 0.3 + fi * 0.5), p.x + sin(t * 0.4 + fi * 0.7)) * 1.2,
                        acos(clamp(p.z / (length(p.xy) + 0.001), -0.99, 0.99)) * 0.6,
                        length(p) * 0.5
                    );
                    p += vec3(
                        sin(p.y * 1.8 + p.z + t * 0.6 + fi * 0.4) * 0.35,
                        cos(p.x * 1.4 - p.z * 0.8 + t * 0.5 + fi * 0.3) * 0.35,
                        sin(p.x + p.y * 1.2 + t * 0.7) * 0.2
                    );
                    p = pow(abs(p + 0.5), vec3(0.7 + 0.12 * sin(t * 0.15 + fi)));
                }
                return p;
            }

            void main() {
                vec2 uv = vUV * 2.0 - 1.0;
                uv.x *= uRes.x / uRes.y;

                // Camera setup
                float ch = uCamAngleH;
                float cv = uCamAngleV;
                float cd = uCamDist;
                vec3 ro = vec3(0.0, 0.0, -cd);
                ro = rotX(ro, cv);
                ro = rotY(ro, ch);
                vec3 ta = vec3(0.0);
                vec3 fwd = normalize(ta - ro);
                vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
                vec3 up = cross(right, fwd);
                vec3 rd = normalize(uv.x * right + uv.y * up + fwd * 2.0);

                // Volumetric ray marching
                vec3 col = vec3(0.0);
                float alpha = 0.0;
                float t = 0.3;
                float t_step = 0.06;

                // Deep space blue → electric purple bg
                vec3 bgCol = mix(
                    vec3(0.005, 0.002, 0.08),
                    vec3(0.12, 0.02, 0.22),
                    sin(uTime * 0.05 + vUV.y * 2.0) * 0.5 + 0.5
                );

                for (int i = 0; i < 8; i++) {
                    vec3 p = ro + rd * t;
                    vec3 wp = warp(p, uTime);

                    // Density from warped coordinates
                    float d1 = sin(wp.x * 5.0 + uTime * 0.7) * cos(wp.y * 4.0 - uTime * 0.5);
                    float d2 = sin(wp.z * 6.0 + uTime * 0.4) * cos(wp.x * 2.5 + wp.y * 3.5 + uTime * 0.6);
                    float d3 = sin(length(wp) * 2.5 - uTime * 0.9) * cos(wp.x - wp.y * 1.5 + uTime * 0.3);
                    float density = abs(d1 * d2 * d3);
                    density = pow(density, 0.35 + 0.1 * sin(uTime * 0.12));

                    // Color: deep blue ↔ electric purple gradient
                    float hueShift = sin(wp.x * 2.0 + uTime * 0.25) * 0.5 + 0.5;
                    vec3 tunnelColor = mix(
                        vec3(0.02, 0.01, 0.15),
                        vec3(0.35, 0.06, 0.55),
                        hueShift
                    );

                    // Warm gold highlights on dense regions
                    float gold = smoothstep(0.2, 0.65, density);
                    tunnelColor += vec3(1.0, 0.78, 0.15) * gold * 0.9 * (1.0 - exp(-density * 4.0));

                    // Volumetric light beams piercing space
                    float beam = pow(abs(sin(wp.y * 10.0 + uTime * 0.9)), 20.0);
                    tunnelColor += vec3(0.5, 0.4, 1.0) * beam * 0.5;
                    float beam2 = pow(abs(sin(wp.z * 6.0 + wp.x * 5.0 + uTime * 0.6)), 8.0);
                    tunnelColor += vec3(1.0, 0.6, 0.2) * beam2 * 0.3;

                    // Light shafts (god rays)
                    float shaft = pow(abs(sin(wp.x * 3.0 + wp.z * 2.0 + uTime * 0.8)), 4.0);
                    tunnelColor += vec3(0.9, 0.7, 0.4) * shaft * 0.4;

                    // Volumetric accumulation
                    float dens = density * 0.15;
                    col += (tunnelColor - col) * dens;
                    alpha += (1.0 - alpha) * dens;

                    t += t_step * (0.4 + density * 2.0);
                    if (alpha > 0.92 || t > 20.0) break;
                }

                col = mix(bgCol, col, alpha);

                // Vignette
                float vig = 1.0 - dot(uv * 0.9, uv * 0.9);
                col *= clamp(vig, 0.0, 1.0);

                // Tone mapping (Reinhard)
                col = col / (col + vec3(1.0));

                gl_FragColor = vec4(col, 1.0);
            }
        `;

        const tvs = compileShader(gl.VERTEX_SHADER, tunnelVS);
        const tfs = compileShader(gl.FRAGMENT_SHADER, tunnelFS);
        if (tvs && tfs) {
            const p = gl.createProgram();
            gl.attachShader(p, tvs);
            gl.attachShader(p, tfs);
            gl.linkProgram(p);
            if (gl.getProgramParameter(p, gl.LINK_STATUS)) this.tunnelProg = p;
        }

        /* ---- Particle shaders ---- */
        const particleVS = `
            attribute vec3 aPos;
            attribute vec3 aColor;
            attribute float aAlpha;
            attribute float aSize;
            uniform mat4 uMVP;
            uniform float uTime;
            varying float vAlpha;
            varying vec3 vColor;
            void main() {
                gl_Position = uMVP * vec4(aPos, 1.0);
                float pulse = 1.0 + 0.3 * sin(uTime * 3.0 + aPos.x * 8.0 + aPos.y * 7.0);
                gl_PointSize = aSize * pulse;
                vAlpha = aAlpha;
                vColor = aColor;
            }
        `;
        const particleFS = `
            precision highp float;
            varying float vAlpha;
            varying vec3 vColor;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                if (d > 0.5) discard;
                float glow = exp(-d * 10.0);
                float core = exp(-d * 30.0);
                gl_FragColor = vec4(vColor + core * 0.5, glow * vAlpha * 0.85);
            }
        `;
        const pvs = compileShader(gl.VERTEX_SHADER, particleVS);
        const pfs = compileShader(gl.FRAGMENT_SHADER, particleFS);
        if (pvs && pfs) {
            const p = gl.createProgram();
            gl.attachShader(p, pvs);
            gl.attachShader(p, pfs);
            gl.linkProgram(p);
            if (gl.getProgramParameter(p, gl.LINK_STATUS)) this.particleProg = p;
        }

        /* ---- Particle data ---- */
        this._initParticles();
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, this.particleRenderData, gl.DYNAMIC_DRAW);
        this.particleBuf = buf;
    }

    /* ---- Particle system ---- */
    _initParticles() {
        const count = this.particleCount;
        const trailLen = this.trailLength;
        this.particleCurrent = new Float32Array(count * 3);
        this.particleVelocity = new Float32Array(count * 3);
        this.particleSizes = new Float32Array(count);
        this.particlePhases = new Float32Array(count);
        this.particleTrailData = new Float32Array(count * trailLen * 3);
        this.particleTrailIdx = new Uint16Array(count);

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.8;
            const i3 = i * 3;
            this.particleCurrent[i3] = r * Math.cos(theta);
            this.particleCurrent[i3 + 1] = r * Math.sin(theta) * 0.5;
            this.particleCurrent[i3 + 2] = (Math.random() - 0.5) * 5;
            this.particleVelocity[i3] = (Math.random() - 0.5) * 0.008;
            this.particleVelocity[i3 + 1] = (Math.random() - 0.5) * 0.008;
            this.particleVelocity[i3 + 2] = 0.008 + Math.random() * 0.025;
            this.particleSizes[i] = 1.0 + Math.random() * 4.0;
            this.particlePhases[i] = Math.random();

            for (let j = 0; j < trailLen; j++) {
                const idx = (i * trailLen + j) * 3;
                this.particleTrailData[idx] = this.particleCurrent[i3];
                this.particleTrailData[idx + 1] = this.particleCurrent[i3 + 1];
                this.particleTrailData[idx + 2] = this.particleCurrent[i3 + 2];
            }
        }

        // Render buffer: pos3 + color3 + alpha1 + size1 = 10 floats per point
        this.renderParticleCount = count * trailLen;
        this.particleRenderData = new Float32Array(this.renderParticleCount * 10);
        this._buildRenderData();
    }

    _buildRenderData() {
        const count = this.particleCount;
        const trailLen = this.trailLength;
        let off = 0;
        for (let i = 0; i < count; i++) {
            const phase = this.particlePhases[i];
            const size = this.particleSizes[i];
            const trailIdx = this.particleTrailIdx[i];
            // Color: blue-purple (phase~0) → gold (phase~1)
            const cr = 0.25 + phase * 0.75;
            const cg = 0.1 + (1.0 - phase) * 0.25 + phase * 0.65;
            const cb = 0.95 - phase * 0.55;
            for (let j = 0; j < trailLen; j++) {
                const histIdx = (trailIdx - j + trailLen) % trailLen;
                const posIdx = (i * trailLen + histIdx) * 3;
                const fade = 1.0 - (j / trailLen);
                const alpha = fade * fade;
                this.particleRenderData[off] = this.particleTrailData[posIdx];
                this.particleRenderData[off + 1] = this.particleTrailData[posIdx + 1];
                this.particleRenderData[off + 2] = this.particleTrailData[posIdx + 2];
                this.particleRenderData[off + 3] = cr * (0.5 + 0.5 * fade);
                this.particleRenderData[off + 4] = cg * (0.4 + 0.6 * fade);
                this.particleRenderData[off + 5] = cb * (0.3 + 0.7 * fade);
                this.particleRenderData[off + 6] = alpha;
                this.particleRenderData[off + 7] = size * (0.3 + 0.7 * fade);
                this.particleRenderData[off + 8] = 0;
                this.particleRenderData[off + 9] = 0;
                off += 10;
            }
        }
    }

    _updateParticles(dt) {
        const count = this.particleCount;
        const trailLen = this.trailLength;
        const k = dt * 0.001;
        const mx = this.mouseX;
        const my = this.mouseY;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            this.particleTrailIdx[i] = (this.particleTrailIdx[i] + 1) % trailLen;
            const newIdx = this.particleTrailIdx[i];

            let px = this.particleCurrent[i3];
            let py = this.particleCurrent[i3 + 1];
            let pz = this.particleCurrent[i3 + 2];
            let vx = this.particleVelocity[i3];
            let vy = this.particleVelocity[i3 + 1];
            let vz = this.particleVelocity[i3 + 2];

            // Mouse gravitational attraction
            const dx = mx * 1.8 - px;
            const dy = my * 1.8 - py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.01) {
                const force = 0.6 * k / (1.0 + dist * 0.3);
                vx += dx * force;
                vy += dy * force;
            }

            px += vx;
            py += vy;
            pz += vz;
            vx *= 0.975;
            vy *= 0.975;
            vz *= 0.995;

            // Z-wrap
            if (pz > 3.0) {
                pz = -3.0;
                px = (Math.random() - 0.5) * 1.5;
                py = (Math.random() - 0.5) * 0.8;
            }

            this.particleCurrent[i3] = px;
            this.particleCurrent[i3 + 1] = py;
            this.particleCurrent[i3 + 2] = pz;
            this.particleVelocity[i3] = vx;
            this.particleVelocity[i3 + 1] = vy;
            this.particleVelocity[i3 + 2] = vz;

            const trailPos = (i * trailLen + newIdx) * 3;
            this.particleTrailData[trailPos] = px;
            this.particleTrailData[trailPos + 1] = py;
            this.particleTrailData[trailPos + 2] = pz;
        }
    }

    /* ---- Mouse / touch controls ---- */
    _initMouseControls() {
        const c = this.canvas;
        const self = this;

        c.addEventListener('mousemove', function (e) {
            const cw = self.canvas.width, ch = self.canvas.height;
            self.mouseX = (e.clientX / cw) * 2 - 1;
            self.mouseY = -(e.clientY / ch) * 2 + 1;
            if (self.mouseDown) {
                self.targetCamAngleH += e.movementX * 0.005;
                self.targetCamAngleV += e.movementY * 0.005;
                self.targetCamAngleV = Math.max(-1.3, Math.min(1.3, self.targetCamAngleV));
                self.autoRotate = false;
                clearTimeout(self._rotateTimeout);
                self._rotateTimeout = setTimeout(function () { self.autoRotate = true; }, 3000);
            }
        });
        c.addEventListener('mousedown', function (e) {
            self.mouseDown = true;
        });
        c.addEventListener('mouseup', function () { self.mouseDown = false; });
        c.addEventListener('mouseleave', function () { self.mouseDown = false; });
        c.addEventListener('wheel', function (e) {
            self.targetCamDist += e.deltaY * 0.005;
            self.targetCamDist = Math.max(0.5, Math.min(10, self.targetCamDist));
            e.preventDefault();
        }, { passive: false });
    }

    /* ---- FPS overlay ---- */
    _initFPSMonitor() {
        if (document.getElementById('tunnelFPSPanel')) return;
        const panel = document.createElement('div');
        panel.id = 'tunnelFPSPanel';
        panel.style.cssText = 'position:fixed;top:16px;left:16px;z-index:9999;background:rgba(0,0,0,0.7);border-radius:10px;padding:10px 16px;font-family:"SF Mono","Cascadia Code","Consolas","JetBrains Mono",monospace;font-size:15px;color:#fff;backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.08);pointer-events:none;display:none;';
        panel.innerHTML = '<span id="tunnelFPSValue" style="font-weight:700;font-size:18px">--</span> <span style="font-size:11px;opacity:0.55;letter-spacing:1px">FPS</span>';
        document.body.appendChild(panel);
        this._fpsPanel = panel;
        this._fpsEl = document.getElementById('tunnelFPSValue');
    }

    /* ---- API ---- */
    stop() {
        const gl = this.gl;
        if (!gl) return;
        if (this.tunnelProg) gl.deleteProgram(this.tunnelProg);
        if (this.particleProg) gl.deleteProgram(this.particleProg);
        if (this.quadBuf) gl.deleteBuffer(this.quadBuf);
        if (this.particleBuf) gl.deleteBuffer(this.particleBuf);
        for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
        if (this._fpsPanel) {
            this._fpsPanel.remove();
            this._fpsPanel = null;
            this._fpsEl = null;
        }
    }

    update(dt) {
        this.time += dt;

        // Camera auto-rotate
        if (this.autoRotate) {
            this.targetCamAngleH += dt * 0.00015;
        }

        // Smooth camera
        const k = Math.min(dt / 16, 3);
        this.camAngleH += (this.targetCamAngleH - this.camAngleH) * 0.08 * k;
        this.camAngleV += (this.targetCamAngleV - this.camAngleV) * 0.08 * k;
        this.camDist += (this.targetCamDist - this.camDist) * 0.08 * k;

        // Benchmark speed ramp (used by _applyPostFX intensity)
        const totalAnimMs = 5500;
        const t = Math.min(this.time / totalAnimMs, 1.0);
        let speed;
        if (t < 0.15) {
            speed = 0.5 + (t / 0.15) * 1.0;
        } else if (t < 0.75) {
            speed = 1.5 + ((t - 0.15) / 0.6) * 2.0;
        } else {
            speed = 3.5 * (1.0 - (t - 0.75) / 0.25);
        }
        this._speed = speed;

        // Update particles
        this._updateParticles(dt);
        this._buildRenderData();

        // Update buffer
        const gl = this.gl;
        if (gl && this.particleBuf) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuf);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.particleRenderData);
        }

        // FPS counter
        this._fpsFrameCount++;
        if (this.time - this._lastFPSTime >= 1000) {
            const fps = Math.round(this._fpsFrameCount * 1000 / (this.time - this._lastFPSTime));
            this._fpsFrameCount = 0;
            this._lastFPSTime = this.time;
            if (this._fpsEl) {
                this._fpsEl.textContent = fps;
                this._fpsEl.style.color = fps < 30 ? '#ff4444' : '#fff';
            }
        }
    }

    draw() {
        const gl = this.gl;
        if (!gl) return;

        if (this._fpsPanel) this._fpsPanel.style.display = 'block';

        const W = this.canvas.width, H = this.canvas.height;
        gl.viewport(0, 0, W, H);
        gl.clearColor(0.005, 0.002, 0.06, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // --- 1. Ray-marched tunnel (fullscreen quad) ---
        if (this.tunnelProg) {
            gl.useProgram(this.tunnelProg);
            gl.uniform1f(gl.getUniformLocation(this.tunnelProg, 'uTime'), this.time * 0.001);
            gl.uniform1f(gl.getUniformLocation(this.tunnelProg, 'uCamAngleH'), this.camAngleH);
            gl.uniform1f(gl.getUniformLocation(this.tunnelProg, 'uCamAngleV'), this.camAngleV);
            gl.uniform1f(gl.getUniformLocation(this.tunnelProg, 'uCamDist'), this.camDist);
            gl.uniform2f(gl.getUniformLocation(this.tunnelProg, 'uRes'), W, H);

            const aPos = gl.getAttribLocation(this.tunnelProg, 'aPos');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.disableVertexAttribArray(aPos);
        }

        // --- 2. Particles (additive glow) ---
        if (this.particleProg && this.particleBuf) {
            const fov = Math.PI / 3.5;
            const proj = this._mat4Perspective(fov, W / H, 0.1, 20);
            const eyeX = Math.sin(this.camAngleH) * Math.cos(this.camAngleV) * 0.3;
            const eyeY = Math.sin(this.camAngleV) * 0.3;
            const eyeZ = Math.cos(this.camAngleH) * Math.cos(this.camAngleV) * 0.3;
            const view = this._mat4LookAt([0, 0, 0], [eyeX, eyeY, eyeZ], [0, 1, 0]);
            const mvp = this._mat4Multiply(proj, view);

            gl.useProgram(this.particleProg);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            gl.depthMask(false);

            gl.uniformMatrix4fv(gl.getUniformLocation(this.particleProg, 'uMVP'), false, mvp);
            gl.uniform1f(gl.getUniformLocation(this.particleProg, 'uTime'), this.time * 0.001);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuf);
            const stride = 10 * 4;
            const aPos = gl.getAttribLocation(this.particleProg, 'aPos');
            const aColor = gl.getAttribLocation(this.particleProg, 'aColor');
            const aAlpha = gl.getAttribLocation(this.particleProg, 'aAlpha');
            const aSize = gl.getAttribLocation(this.particleProg, 'aSize');

            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(aColor);
            gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 12);
            gl.enableVertexAttribArray(aAlpha);
            gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, stride, 24);
            gl.enableVertexAttribArray(aSize);
            gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, stride, 28);

            gl.drawArrays(gl.POINTS, 0, this.renderParticleCount);

            gl.disableVertexAttribArray(aPos);
            gl.disableVertexAttribArray(aColor);
            gl.disableVertexAttribArray(aAlpha);
            gl.disableVertexAttribArray(aSize);
            gl.disable(gl.BLEND);
            gl.depthMask(true);
        }
    }
}

/* ======================= 场景 2: 星云绽放 (Nebula Bloom) ======================= */
class NebulaBloomScene {
    constructor(canvas, w, h) {
        this.canvas = canvas;
        this.W = w;
        this.H = h;
        this.time = 0;
        this.galaxyRotation = 0;
        this.camAngle = 0;
        this.gl = null;
        this.prog = null;
        this.particleBuf = null;
        this.particleCount = 10000;
        this._initGL();
    }

    _mat4Perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0
        ]);
    }
    _mat4LookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
        const zx = ex - cx, zy = ey - cy, zz = ez - cz;
        let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
        const z = [zx / len, zy / len, zz / len];
        const xx = uy * z[2] - uz * z[1], xy = uz * z[0] - ux * z[2], xz = ux * z[1] - uy * z[0];
        len = Math.sqrt(xx * xx + xy * xy + xz * xz);
        const x = [xx / len, xy / len, xz / len];
        const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
        return new Float32Array([
            x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
            -(x[0] * ex + x[1] * ey + x[2] * ez),
            -(y[0] * ex + y[1] * ey + y[2] * ez),
            -(z[0] * ex + z[1] * ey + z[2] * ez), 1
        ]);
    }
    _mat4Multiply(a, b) {
        const o = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                o[j * 4 + i] = a[i] * b[j * 4] + a[i + 4] * b[j * 4 + 1] + a[i + 8] * b[j * 4 + 2] + a[i + 12] * b[j * 4 + 3];
            }
        }
        return o;
    }
    _mat4RotateY(m, a) {
        const c = Math.cos(a), s = Math.sin(a);
        const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
        const m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];
        m[0] = m0 * c + m8 * s; m[1] = m1 * c + m9 * s; m[2] = m2 * c + m10 * s; m[3] = m3 * c + m11 * s;
        m[8] = m0 * -s + m8 * c; m[9] = m1 * -s + m9 * c; m[10] = m2 * -s + m10 * c; m[11] = m3 * -s + m11 * c;
        return m;
    }

    _initGL() {
        const gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true }) || this.canvas.getContext('experimental-webgl');
        if (!gl) return;
        this.gl = gl;

        function compileShader(type, src) {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.warn('Nebula shader error:', gl.getShaderInfoLog(sh));
                gl.deleteShader(sh);
                return null;
            }
            return sh;
        }

        // Vertex shader: per-particle phase for organic motion
        const vsSource = `
            attribute vec3 aPos;
            attribute vec3 aColor;
            attribute float aSize;
            attribute float aPhase;
            uniform mat4 uMVP;
            uniform float uTime;
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                vec3 p = aPos;
                // Vertical oscillation per particle
                p.y += sin(uTime * 0.8 + aPhase * 6.28) * 0.04;
                // Radial pulse
                float pulse = 0.85 + 0.15 * sin(uTime * 0.6 + aPhase * 4.0);
                gl_Position = uMVP * vec4(p, 1.0);
                gl_PointSize = aSize * pulse * 1.5;
                vColor = aColor;
                vAlpha = 0.5 + 0.5 * sin(uTime * 1.2 + aPhase * 3.14);
            }
        `;
        const fsSource = `
            precision mediump float;
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                if (d > 0.5) discard;
                float glow = exp(-d * 6.0);
                gl_FragColor = vec4(vColor, glow * vAlpha * 0.7);
            }
        `;

        const vs = compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (vs && fs) {
            const prog = gl.createProgram();
            gl.attachShader(prog, vs);
            gl.attachShader(prog, fs);
            gl.linkProgram(prog);
            if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                this.prog = prog;
            } else {
                console.warn('Nebula program link error');
                return;
            }
        } else return;

        // Generate 10000 particles in a 3-arm spiral galaxy
        const COUNT = 10000;
        const stride = 10; // pos3 + color3 + size1 + phase1 = 8 floats
        const data = new Float32Array(COUNT * stride);
        const armCount = 3;

        function hsl2rgb(h, s, l) {
            const c2 = (1 - Math.abs(2 * l - 1)) * s;
            const x2 = c2 * (1 - Math.abs((h * 6) % 2 - 1));
            const m = l - c2 / 2;
            let r, g, b;
            if (h < 1/6) { r = c2; g = x2; b = 0; }
            else if (h < 2/6) { r = x2; g = c2; b = 0; }
            else if (h < 3/6) { r = 0; g = c2; b = x2; }
            else if (h < 4/6) { r = 0; g = x2; b = c2; }
            else if (h < 5/6) { r = x2; g = 0; b = c2; }
            else { r = c2; g = 0; b = x2; }
            return [r + m, g + m, b + m];
        }

        for (let i = 0; i < COUNT; i++) {
            const arm = Math.floor(Math.random() * armCount);
            const armAngle = (arm / armCount) * Math.PI * 2;
            const radius = Math.pow(Math.random(), 0.4) * 4.5;
            const spiralAngle = radius * 2.3 + armAngle + (Math.random() - 0.5) * 0.25 * (0.2 + radius / 6);
            const spread = 0.08 + Math.random() * 0.15 * (0.5 + radius / 3);

            data[i * stride] = radius * Math.cos(spiralAngle);
            data[i * stride + 1] = (Math.random() - 0.5) * spread * 2;
            data[i * stride + 2] = radius * Math.sin(spiralAngle);

            // Color map: inner warm → mid purple → outer blue
            const t = Math.min(radius / 4.5, 1);
            let hue;
            if (t < 0.3) hue = 0.05 + t / 0.3 * 0.1;
            else if (t < 0.6) hue = 0.15 + (t - 0.3) / 0.3 * 0.55;
            else hue = 0.7 + (t - 0.6) / 0.4 * 0.25;
            hue += (Math.random() - 0.5) * 0.05;

            const rgb = hsl2rgb(hue, 0.85, 0.55 + Math.random() * 0.2);
            data[i * stride + 3] = rgb[0];
            data[i * stride + 4] = rgb[1];
            data[i * stride + 5] = rgb[2];
            data[i * stride + 6] = 1.5 + Math.random() * 4.0 + radius * 0.3;
            data[i * stride + 7] = Math.random();
        }

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        this.particleBuf = buf;
        this._initCoreStar();
    }

    stop() {
        const gl = this.gl;
        if (!gl) return;
        if (this.prog) gl.deleteProgram(this.prog);
        if (this.particleBuf) gl.deleteBuffer(this.particleBuf);
        if (this.coreBuf) gl.deleteBuffer(this.coreBuf);
    }

    _initCoreStar() {
        const gl = this.gl;
        // Single bright point at galaxy center
        const data = new Float32Array([0, 0, 0, 1.0, 0.85, 0.5, 20.0, 0]);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        this.coreBuf = buf;
    }

    update(dt) {
        const k = dt / 16;
        this.time += dt;

        // Galaxy self-rotation
        this.galaxyRotation += 0.003 * k;

        // Breathing pulse for whole galaxy
        this._pulse = 1.0 + 0.15 * Math.sin(this.time * 0.0015);

        const totalTime = this.time;
        const t = Math.min(totalTime / 5500, 1.0);

        // Reset lookAt target
        this._lookTarget = [0, 0, 0];

        if (t < 0.2) {
            // Segment 1: Fast zoom from far distance + orbital sweep
            const seg = t / 0.2;
            const ease = seg < 0.5 ? 2*seg*seg : 1-Math.pow(-2*seg+2,2)/2;
            this.camAngle = seg * Math.PI * 0.4;
            this.camDist = 10.0 - ease * 4.5;
            this.camHeight = 1.5 - seg * 0.3;
        } else if (t < 0.65) {
            // Segment 2: DIVE through the galaxy disk!
            const seg = (t - 0.2) / 0.45;
            const ease = seg < 0.5 ? 2*seg*seg : 1-Math.pow(-2*seg+2,2)/2;
            this.camAngle = Math.PI * 0.4 + seg * Math.PI * 0.7;
            this.camDist = 5.5 - ease * 3.0;
            this.camHeight = 1.2 - seg * 2.7; // from +1.2 to -1.5, piercing the disk!

            // During dive, look forward along path (creates the "flying through" sensation)
            const fwdAngle = this.camAngle + 0.4;
            const fwdDist = this.camDist * 0.35;
            this._lookTarget = [
                fwdDist * Math.sin(fwdAngle),
                this.camHeight * 0.2,
                fwdDist * Math.cos(fwdAngle)
            ];
        } else {
            // Segment 3: Pull back, slow flip, reveal full galaxy
            const seg = (t - 0.65) / 0.35;
            this.camAngle = Math.PI * 1.1 + seg * Math.PI * 1.2;
            this.camDist = 2.5 + seg * 4.5;
            this.camHeight = -0.5 + seg * 2.2;
        }
    }

    draw() {
        const gl = this.gl;
        if (!gl || !this.prog) return;

        const W = gl.canvas.width, H = gl.canvas.height;
        gl.viewport(0, 0, W, H);
        gl.clearColor(0.01, 0.005, 0.02, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        const lt = this._lookTarget || [0, 0, 0];
        const proj = this._mat4Perspective(Math.PI / 4, W / H, 0.1, 30);
        const eyeX = this.camDist * Math.sin(this.camAngle);
        const eyeY = this.camHeight;
        const eyeZ = this.camDist * Math.cos(this.camAngle);
        const view = this._mat4LookAt(eyeX, eyeY, eyeZ, lt[0], lt[1], lt[2], 0, 1, 0);
        const model = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        this._mat4RotateY(model, this.galaxyRotation);
        const mv = this._mat4Multiply(view, model);
        const mvp = this._mat4Multiply(proj, mv);

        // Breathing pulse uniform (modulate particle sizes)
        const pulseUniform = this._pulse || 1.0;

        gl.useProgram(this.prog);
        const mvpLoc = gl.getUniformLocation(this.prog, 'uMVP');
        const timeLoc = gl.getUniformLocation(this.prog, 'uTime');
        gl.uniformMatrix4fv(mvpLoc, false, mvp);
        gl.uniform1f(timeLoc, this.time * 0.001);

        const posLoc = gl.getAttribLocation(this.prog, 'aPos');
        const colLoc = gl.getAttribLocation(this.prog, 'aColor');
        const sizeLoc = gl.getAttribLocation(this.prog, 'aSize');
        const phaseLoc = gl.getAttribLocation(this.prog, 'aPhase');

        const stride = 4 * 10;

        // === Draw galaxy particles ===
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuf);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(colLoc);
        gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, stride, 12);
        gl.enableVertexAttribArray(sizeLoc);
        gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, stride, 24);
        gl.enableVertexAttribArray(phaseLoc);
        gl.vertexAttribPointer(phaseLoc, 1, gl.FLOAT, false, stride, 28);
        gl.drawArrays(gl.POINTS, 0, this.particleCount);

        // === Draw core star (bright center) ===
        if (this.coreBuf) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.coreBuf);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(colLoc);
            gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, stride, 12);
            gl.enableVertexAttribArray(sizeLoc);
            gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, stride, 24);
            gl.enableVertexAttribArray(phaseLoc);
            gl.vertexAttribPointer(phaseLoc, 1, gl.FLOAT, false, stride, 28);
            gl.drawArrays(gl.POINTS, 0, 1);
        }
    }
}

/* ======================= 场景 3: 地球降临 (Earth Pro) ======================= */
class ParticleEarthScene {
    constructor(canvasOrCtx, w, h) {
        if (canvasOrCtx.getContext) {
            // It's a canvas
            this.canvas = canvasOrCtx;
            this.W = w; this.H = h;
        } else {
            this.canvas = null;
            this.ctx = canvasOrCtx;
            this.W = w; this.H = h;
        }
        this.rotation = 0;
        this.cameraZ = 0;
        this.time = 0;
        this.gl = null;
        this.prog = null;
        this.earthMesh = null;
        this.cloudMesh = null;
        this.starsVerts = null;
        this.starsBuffer = null;
        this.atmosBuffer = null;
        this.atmosphereDrawType = 'fan'; // TRIANGLE_FAN fallback
        this.texture = null;
        this.cloudTexture = null;
        this.auroraPhase = 0;
        this._initGL();
    }

    _initGL() {
        // Try to get WebGL context from canvas
        if (!this.canvas) return;

        // IMPORTANT: Canvas can only have ONE context type at a time.
        // If a 2D context was previously created on this canvas (by a previous scene),
        // we need to explicitly clear it before WebGL can be obtained.
        try {
            const oldCtx = this.canvas.getContext('2d');
            if (oldCtx) {
                oldCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        } catch(e) {}

        this.gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true }) || this.canvas.getContext('experimental-webgl');
        if (!this.gl) return;

        const gl = this.gl;

        // Vertex shader
        const vsSource = `
            attribute vec3 aPos;
            attribute vec2 aUV;
            uniform mat4 uMVP;
            varying vec2 vUV;
            varying vec3 vPos;
            void main() {
                gl_Position = uMVP * vec4(aPos, 1.0);
                vUV = aUV;
                vPos = aPos;
            }
        `;

        // Fragment shader - terrain + lighting + clouds + atmosphere + aurora (enhanced)
        const fsSource = `
            precision mediump float;
            varying vec2 vUV;
            varying vec3 vPos;
            uniform float uTime;
            uniform sampler2D uTex;
            uniform sampler2D uCloudTex;
            uniform vec3 uLightDir;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            float noise(vec2 p) {
                vec2 i = floor(p); vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
                           mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
            }
            float fbm(vec2 p) {
                float v = 0.0; float a = 0.5;
                for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
                return v;
            }
            float fbm3(vec2 p) {
                float v = 0.0; float a = 0.5;
                for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
                return v;
            }

            void main() {
                vec3 n = normalize(vPos);
                float lat = asin(n.y) * 0.3183;
                float lon = atan(n.z, n.x) * 0.3183;

                // Terrain color: fbm noise (higher freq for more detail)
                float elev = fbm(vec2(lon * 5.0 + 100.0, lat * 5.0));
                float isLand = step(0.48, elev);
                vec3 ocean = mix(vec3(0.04, 0.12, 0.40), vec3(0.08, 0.25, 0.65), fbm(vec2(lon*10.0+50.0, lat*10.0)));
                vec3 land = mix(vec3(0.08, 0.30, 0.04), vec3(0.50, 0.38, 0.18), fbm(vec2(lon*3.0, lat*3.0+200.0)));
                vec3 terrain = mix(ocean, land, isLand);

                // Ice caps (smoother transition)
                float ice = smoothstep(0.78, 0.96, abs(n.y));
                terrain = mix(terrain, vec3(0.92, 0.96, 1.0), ice);

                // Lighting
                vec3 L = normalize(uLightDir);
                float diff = max(dot(n, L), 0.0);
                float ambient = 0.10;
                vec3 lit = terrain * (ambient + diff * 0.90);

                // Night side: city lights with flickering
                float night = 1.0 - smoothstep(-0.15, 0.15, diff);
                float citySeed = hash(vec2(lon * 30.0 + 100.0, lat * 30.0 + 200.0));
                float flicker = 0.7 + 0.3 * sin(uTime * (2.0 + citySeed * 8.0) + citySeed * 100.0);
                float cityNoise = fbm3(vec2(lon * 15.0 + 300.0, lat * 15.0));
                float cities = step(0.60, cityNoise) * isLand * night * 0.6 * flicker;
                vec3 cityColor = mix(vec3(1.0, 0.7, 0.3), vec3(1.0, 0.9, 0.6), citySeed);
                lit += cities * cityColor;

                // Clouds with improved lighting
                float cloud = texture2D(uCloudTex, vec2(vUV.x + uTime * 0.004, vUV.y)).r;
                cloud = smoothstep(0.35, 0.72, cloud);
                float cloudLit = max(dot(n, L), 0.0);
                vec3 cloudColor = mix(vec3(0.35, 0.35, 0.40), vec3(1.0, 1.0, 1.0), cloudLit * 0.6);
                lit = mix(lit, cloudColor, cloud * 0.85);

                // Atmosphere rim glow (Rayleigh-like scattering)
                float rim = 1.0 - abs(dot(n, vec3(0.0, 1.0, 0.0)));
                rim = pow(rim, 2.5);
                float sunGlow = max(dot(n, L), 0.0);
                sunGlow = pow(sunGlow, 6.0);
                // Wavelength-dependent scattering: blue scatters more
                vec3 rayleigh = vec3(0.3, 0.6, 1.0);
                vec3 mie = vec3(1.0, 0.8, 0.5);
                vec3 atmosColor = mix(rayleigh, mie, sunGlow);
                float atmosStrength = rim * 0.65 + sunGlow * 0.5;
                lit += atmosColor * atmosStrength;

                // Aurora at poles (multi-layer, enhanced)
                float auroraN = smoothstep(0.45, 0.97, n.y) * (1.0 - smoothstep(0.97, 1.0, n.y));
                float auroraS = smoothstep(0.45, 0.97, -n.y) * (1.0 - smoothstep(0.97, 1.0, -n.y));
                float auroraVal = auroraN + auroraS;
                if (auroraVal > 0.05) {
                    float aWave1 = sin(lon * 25.0 + uTime * 1.8) * 0.5 + 0.5;
                    float aWave2 = sin(lon * 15.0 + uTime * 1.2 + 2.0) * 0.5 + 0.5;
                    float aWave = aWave1 * 0.6 + aWave2 * 0.4;
                    aWave *= sin(lat * 12.0 + uTime * 0.6) * 0.5 + 0.5;
                    float auroraFade = night * 0.5 + 0.15;
                    // Multi-color aurora: green → magenta → teal
                    float colorShift = sin(uTime * 0.2 + lon * 3.0) * 0.5 + 0.5;
                    vec3 auroraColor = mix(vec3(0.0, 1.0, 0.4), vec3(0.6, 0.0, 1.0), colorShift);
                    auroraColor = mix(auroraColor, vec3(0.0, 0.8, 1.0), sin(uTime * 0.15 + lon * 2.0) * 0.5 + 0.5);
                    lit += auroraColor * auroraVal * aWave * auroraFade * 1.2;
                }

                gl_FragColor = vec4(lit, 1.0);
            }
        `;

        function compileShader(type, src) {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.warn('Shader error:', gl.getShaderInfoLog(sh));
                gl.deleteShader(sh);
                return null;
            }
            return sh;
        }

        const vs = compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return; // fallback silently

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn('Program link error:', gl.getProgramInfoLog(prog));
            return;
        }
        this.prog = prog;
        this._buildMesh(gl, prog);
        this._buildStars(gl, prog);
        this._buildAtmosphere(gl, prog);
        this._buildTexture(gl);
        this._buildCloudTexture(gl);
        this._buildMoon(gl, prog);
    }

    _buildMesh(gl, prog) {
        // UV sphere with lat/lon grid, no top/bottom caps
        const LAT_SEGS = 80, LON_SEGS = 160;
        const verts = [], uvs = [], indices = [];

        for (let lat = 0; lat <= LAT_SEGS; lat++) {
            const theta = lat * Math.PI / LAT_SEGS;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            for (let lon = 0; lon <= LON_SEGS; lon++) {
                const phi = lon * 2 * Math.PI / LON_SEGS;
                const x = Math.cos(phi) * sinTheta;
                const y = cosTheta;
                const z = Math.sin(phi) * sinTheta;
                verts.push(x, y, z);
                uvs.push(lon / LON_SEGS, lat / LAT_SEGS);
            }
        }
        for (let lat = 0; lat < LAT_SEGS; lat++) {
            for (let lon = 0; lon < LON_SEGS; lon++) {
                const a = lat * (LON_SEGS + 1) + lon;
                const b = a + LON_SEGS + 1;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

        const uvbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        this.earthMesh = { vbo, uvbo, ibo, count: indices.length };
    }

    _buildStars(gl, prog) {
        const count = 500;
        const verts = [];
        for (let i = 0; i < count; i++) {
            // Random on sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 8 + Math.random() * 2;
            verts.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        this.starsBuffer = buf;
        this.starsCount = count;

        // Star shader (simple point rendering via gl_PointSize)
        const starVS = `
            attribute vec3 aPos;
            uniform mat4 uMVP;
            uniform float uSize;
            void main() {
                gl_Position = uMVP * vec4(aPos, 1.0);
                gl_PointSize = uSize;
            }
        `;
        const starFS = `
            precision mediump float;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                if (d > 0.5) discard;
                float alpha = 1.0 - d * 2.0;
                gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * 0.8);
            }
        `;
        const svs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(svs, starVS);
        gl.compileShader(svs);
        const sfs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(sfs, starFS);
        gl.compileShader(sfs);
        const starProg = gl.createProgram();
        gl.attachShader(starProg, svs);
        gl.attachShader(starProg, sfs);
        gl.linkProgram(starProg);
        this.starProg = starProg;
    }

    _buildAtmosphere(gl, prog) {
        // Atmosphere as a simple large sphere slightly bigger than earth
        const LAT = 24, LON = 48;
        const verts = [], uvs = [], indices = [];
        for (let lat = 0; lat <= LAT; lat++) {
            const theta = lat * Math.PI / LAT;
            const sinT = Math.sin(theta), cosT = Math.cos(theta);
            for (let lon = 0; lon <= LON; lon++) {
                const phi = lon * 2 * Math.PI / LON;
                verts.push(Math.cos(phi) * sinT * 1.04, cosT * 1.04, Math.sin(phi) * sinT * 1.04);
                uvs.push(lon / LON, lat / LAT);
            }
        }
        for (let lat = 0; lat < LAT; lat++) {
            for (let lon = 0; lon < LON; lon++) {
                const a = lat * (LON + 1) + lon, b = a + LON + 1;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        const uvbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        this.atmosMesh = { vbo, uvbo, ibo, count: indices.length };
    }

    _buildTexture(gl) {
        // Procedural earth texture: 512x256
        const W = 512, H = 256;
        const data = new Uint8Array(W * H * 4);

        function hash(x, y) {
            let h = x * 374761393 + y * 668265263;
            h = (h ^ (h >> 13)) * 1274126177;
            return ((h ^ (h >> 16)) & 0xFFFFFFFF) / 0xFFFFFFFF;
        }
        function valueNoise(x, y) {
            const xi = Math.floor(x), yi = Math.floor(y);
            const xf = x - xi, yf = y - yi;
            const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
            const a = hash(xi, yi), b = hash(xi + 1, yi);
            const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
            return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
        }
        function fbm2(x, y, oct) {
            let v = 0, amp = 0.5, freq = 1.0;
            for (let i = 0; i < oct; i++) {
                v += amp * valueNoise(x * freq, y * freq);
                amp *= 0.5; freq *= 2.0;
            }
            return v;
        }

        for (let py = 0; py < H; py++) {
            for (let px = 0; px < W; px++) {
                const lon = (px / W) * 2 * Math.PI;
                const lat = ((py / H) - 0.5) * Math.PI;
                const nx = Math.cos(lat) * Math.cos(lon);
                const ny = Math.sin(lat);
                const nz = Math.cos(lat) * Math.sin(lon);

                const scale = 6.0;
                const n = fbm2(nx * scale + 100, ny * scale, 6);

                // latitude-based terrain
                let r, g, b;
                const latFrac = Math.abs(ny);
                const land = n > 0.48 + latFrac * 0.08 ? 1 : 0;

                if (latFrac > 0.88) {
                    // Ice
                    r = 230; g = 240; b = 255;
                } else if (land) {
                    // Land - green to brown
                    const t = (n - 0.48) / 0.12;
                    r = Math.round(20 + t * 120);
                    g = Math.round(80 + t * 20);
                    b = Math.round(20 + t * 5);
                } else {
                    // Ocean - deep blue
                    r = Math.round(10 + n * 40);
                    g = Math.round(40 + n * 80);
                    b = Math.round(100 + n * 80);
                }

                const idx = (py * W + px) * 4;
                data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
            }
        }

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.texture = tex;
    }

    _buildCloudTexture(gl) {
        // White noise clouds
        const W = 256, H = 128;
        const data = new Uint8Array(W * H * 4);
        for (let i = 0; i < W * H; i++) {
            const v = Math.random();
            data[i * 4] = 255;
            data[i * 4 + 1] = 255;
            data[i * 4 + 2] = 255;
            data[i * 4 + 3] = Math.round(v * 200 + 55);
        }
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.cloudTexture = tex;
    }

    _buildMoon(gl, prog) {
        const SEG = 16;
        const verts = [];
        for (let lat = 0; lat <= SEG; lat++) {
            const theta = lat * Math.PI / SEG;
            const st = Math.sin(theta), ct = Math.cos(theta);
            for (let lon = 0; lon <= SEG; lon++) {
                const phi = lon * 2 * Math.PI / SEG;
                verts.push(Math.cos(phi) * st, ct, Math.sin(phi) * st);
            }
        }
        const indices = [];
        for (let lat = 0; lat < SEG; lat++) {
            for (let lon = 0; lon < SEG; lon++) {
                const a = lat * (SEG + 1) + lon, b = a + SEG + 1;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        this.moonMesh = { vbo, ibo, count: indices.length };

        // Simple gray shader for moon
        const mVS = `
            attribute vec3 aPos;
            uniform mat4 uMVP;
            void main() { gl_Position = uMVP * vec4(aPos, 1.0); }
        `;
        const mFS = `
            precision mediump float;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                gl_FragColor = vec4(0.5, 0.5, 0.52, 0.9);
            }
        `;
        function cs(t, s) {
            const sh = gl.createShader(t);
            gl.shaderSource(sh, s);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
            return sh;
        }
        const mvs = cs(gl.VERTEX_SHADER, mVS);
        const mfs = cs(gl.FRAGMENT_SHADER, mFS);
        if (mvs && mfs) {
            const mp = gl.createProgram();
            gl.attachShader(mp, mvs);
            gl.attachShader(mp, mfs);
            gl.linkProgram(mp);
            if (gl.getProgramParameter(mp, gl.LINK_STATUS)) this.moonProg = mp;
        }
        this.moonAngle = 0;
    }

    _mat4Perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0
        ]);
    }

    _mat4LookAt(eye, center, up) {
        const zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
        let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
        const z = [zx / len, zy / len, zz / len];
        const xx = up[1] * z[2] - up[2] * z[1], xy = up[2] * z[0] - up[0] * z[2], xz = up[0] * z[1] - up[1] * z[0];
        len = Math.sqrt(xx * xx + xy * xy + xz * xz);
        const x = [xx / len, xy / len, xz / len];
        const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
        return new Float32Array([
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
            -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
            -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
            1
        ]);
    }

    _mat4RotateY(m, a) {
        const c = Math.cos(a), s = Math.sin(a);
        const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
        const m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];
        m[0] = m0 * c + m8 * s; m[1] = m1 * c + m9 * s; m[2] = m2 * c + m10 * s; m[3] = m3 * c + m11 * s;
        m[8] = m0 * -s + m8 * c; m[9] = m1 * -s + m9 * c; m[10] = m2 * -s + m10 * c; m[11] = m3 * -s + m11 * c;
        return m;
    }

    _mat4Multiply(a, b) {
        const out = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                out[j * 4 + i] = a[i] * b[j * 4] + a[i + 4] * b[j * 4 + 1] + a[i + 8] * b[j * 4 + 2] + a[i + 12] * b[j * 4 + 3];
            }
        }
        return out;
    }

    stop() {
        const gl = this.gl;
        if (!gl) return;
        if (this.earthMesh) {
            gl.deleteBuffer(this.earthMesh.vbo);
            gl.deleteBuffer(this.earthMesh.uvbo);
            gl.deleteBuffer(this.earthMesh.ibo);
        }
        if (this.starsBuffer) gl.deleteBuffer(this.starsBuffer);
        if (this.atmosMesh) {
            gl.deleteBuffer(this.atmosMesh.vbo);
            gl.deleteBuffer(this.atmosMesh.uvbo);
            gl.deleteBuffer(this.atmosMesh.ibo);
        }
        if (this.texture) gl.deleteTexture(this.texture);
        if (this.cloudTexture) gl.deleteTexture(this.cloudTexture);
        if (this.prog) gl.deleteProgram(this.prog);
        if (this.moonProg) gl.deleteProgram(this.moonProg);
        if (this.moonMesh) {
            gl.deleteBuffer(this.moonMesh.vbo);
            gl.deleteBuffer(this.moonMesh.ibo);
        }
    }

    update(dt) {
        const k = dt / 16;
        this.time += dt;
        this.auroraPhase += 0.002 * k;
        // Earth self-rotation
        this.rotation += 0.004 * k;
        // Moon orbit
        this.moonAngle += 0.0002 * k;

        // ===== Cinematic camera animation v3 (dramatic) =====
        // 三段式：极远zoom → 高速俯冲+极地翻转 → 拉远收场
        const animDuration = 5500;
        const t = Math.min(this.time / animDuration, 1.0);

        if (t < 0.25) {
            // Segment 1: 从极远距离快速拉近
            const seg = t / 0.25;
            this._camDist = 8.0 - seg * 4.5; // 8.0 → 3.5
            this._camAngle = seg * Math.PI * 2.0;
            this._camHeight = 0.3 + Math.sin(seg * Math.PI * 2) * 0.2;
            this._fov = Math.PI / 6 + seg * Math.PI / 12; // 30° → 45°
            this._lookTarget = [0, 0, 0];
        } else if (t < 0.7) {
            // Segment 2: 高速俯冲 + 极地翻转
            const seg = (t - 0.25) / 0.45;
            const ease = seg < 0.5 ? 2 * seg * seg : 1 - Math.pow(-2 * seg + 2, 2) / 2;
            this._camDist = 3.5 - ease * 2.3;
            this._camAngle = Math.PI * 2.0 * 0.25 + seg * Math.PI * 1.5;
            // Polar flip: camera swings from south to north
            this._camHeight = 0.5 - ease * 1.2;
            this._fov = Math.PI / 4 + ease * Math.PI / 5;
            // Look forward along surface
            const blend = Math.min(seg * 2.0, 1.0);
            const fwdAngle = this._camAngle + 0.4;
            const surfaceTarget = [
                Math.sin(fwdAngle) * 0.95,
                this._camHeight * 0.2 + 0.1,
                Math.cos(fwdAngle) * 0.95
            ];
            this._lookTarget = [
                blend * surfaceTarget[0],
                blend * surfaceTarget[1],
                blend * surfaceTarget[2]
            ];
        } else {
            // Segment 3: 拉远收场（月球可见方向）
            const seg = (t - 0.7) / 0.3;
            this._camDist = 1.2 + seg * 3.5;
            this._camAngle = Math.PI * 2.0 * 0.25 + Math.PI * 1.5 * 0.45 + seg * Math.PI * 0.4;
            this._camHeight = -0.7 + seg * 1.5;
            this._fov = Math.PI / 4 + (1 - seg) * Math.PI / 10;
            this._lookTarget = [0.3, 0.1, 0];
        }
    }

    draw() {
        const gl = this.gl;
        const ctx2d = this.ctx;

        if (gl && this.prog) {
            // WebGL render path
            this._drawGL(gl);
        } else {
            // WebGL not available - try to get 2D context and draw fallback
            // This handles the case where canvas was previously used for 2D rendering
            const theCtx = ctx2d || (this.canvas ? this.canvas.getContext('2d') : null);
            if (theCtx) {
                theCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this._drawFallback(theCtx);
            }
        }
    }

    _drawGL(gl) {
        const W = this.canvas.width, H = this.canvas.height;
        gl.viewport(0, 0, W, H);
        gl.clearColor(0.02, 0.02, 0.06, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Camera — cinematic animation (三段式过场视角)
        const camDist = this._camDist !== undefined ? this._camDist : 3.0;
        const camAngle = this._camAngle !== undefined ? this._camAngle : 0;
        const camHeight = this._camHeight !== undefined ? this._camHeight : 0.5;
        const fov = this._fov !== undefined ? this._fov : Math.PI / 4;
        const lookTarget = this._lookTarget || [0, 0, 0];

        const eye = [camDist * Math.sin(camAngle), camHeight, camDist * Math.cos(camAngle)];
        const proj = this._mat4Perspective(fov, W / H, 0.1, 100);
        const view = this._mat4LookAt(eye, lookTarget, [0, 1, 0]);
        const pv = this._mat4Multiply(proj, view);
        const model = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        const mvp = pv; // no separate model transform

        // Light direction (slowly rotating with earth)
        const lightAngle = this.time * 0.0001;
        const lightDir = [Math.cos(lightAngle), 0.3, Math.sin(lightAngle)];

        // Draw stars
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.useProgram(this.starProg);
        const starLoc = gl.getAttribLocation(this.starProg, 'aPos');
        const starMVP = gl.getUniformLocation(this.starProg, 'uMVP');
        const starSize = gl.getUniformLocation(this.starProg, 'uSize');
        gl.uniformMatrix4fv(starMVP, false, pv);
        gl.uniform1f(starSize, 2.5);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.starsBuffer);
        gl.enableVertexAttribArray(starLoc);
        gl.vertexAttribPointer(starLoc, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.POINTS, 0, this.starsCount);
        gl.depthMask(true);

        // Draw earth
        gl.useProgram(this.prog);
        const mvpLoc = gl.getUniformLocation(this.prog, 'uMVP');
        const timeLoc = gl.getUniformLocation(this.prog, 'uTime');
        const texLoc = gl.getUniformLocation(this.prog, 'uTex');
        const cloudLoc = gl.getUniformLocation(this.prog, 'uCloudTex');
        const lightLoc = gl.getUniformLocation(this.prog, 'uLightDir');

        // Build MVP with model rotation
        const rotModel = this._mat4RotateY(new Float32Array(model), this.rotation);
        const mvpWithRot = this._mat4Multiply(pv, rotModel);
        gl.uniformMatrix4fv(mvpLoc, false, mvpWithRot);
        gl.uniform1f(timeLoc, this.time * 0.001);
        gl.uniform3fv(lightLoc, lightDir);

        // Terrain texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(texLoc, 0);

        // Cloud texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.cloudTexture);
        gl.uniform1i(cloudLoc, 1);

        const posLoc = gl.getAttribLocation(this.prog, 'aPos');
        const uvLoc = gl.getAttribLocation(this.prog, 'aUV');

        gl.bindBuffer(gl.ARRAY_BUFFER, this.earthMesh.vbo);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.earthMesh.uvbo);
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.earthMesh.ibo);
        gl.drawElements(gl.TRIANGLES, this.earthMesh.count, gl.UNSIGNED_SHORT, 0);

        // Atmosphere glow (additive)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.depthMask(false);

        // Simple atmosphere: large glowing sphere
        const atmosVS = `
            attribute vec3 aPos;
            uniform mat4 uMVP;
            varying vec3 vNorm;
            void main() {
                gl_Position = uMVP * vec4(aPos * 1.06, 1.0);
                vNorm = aPos;
            }
        `;
        const atmosFS = `
            precision mediump float;
            varying vec3 vNorm;
            void main() {
                float rim = 1.0 - abs(dot(normalize(vNorm), vec3(0.0, 1.0, 0.0)));
                rim = pow(rim, 2.5);
                vec3 atmosColor = mix(vec3(0.2, 0.5, 1.0), vec3(0.1, 0.2, 0.8), rim);
                float alpha = rim * 0.55;
                gl_FragColor = vec4(atmosColor, alpha);
            }
        `;

        // Draw atmosphere using the atmosMesh with additive blending
        if (this.atmosMesh) {
            const atmosVS = `
                attribute vec3 aPos;
                uniform mat4 uMVP;
                varying vec3 vNorm;
                void main() {
                    gl_Position = uMVP * vec4(aPos * 1.06, 1.0);
                    vNorm = aPos;
                }
            `;
            const atmosFS = `
                precision mediump float;
                varying vec3 vNorm;
                uniform vec3 uLightDir;
                void main() {
                    vec3 n = normalize(vNorm);
                    float rim = 1.0 - abs(dot(n, vec3(0.0, 1.0, 0.0)));
                    rim = pow(rim, 2.0);
                    float sunDot = max(dot(n, normalize(uLightDir)), 0.0);
                    vec3 atmosColor = mix(vec3(0.15, 0.4, 1.0), vec3(0.6, 0.8, 1.0), sunDot);
                    float alpha = rim * 0.45;
                    gl_FragColor = vec4(atmosColor, alpha);
                }
            `;
            const avs = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(avs, atmosVS);
            gl.compileShader(avs);
            const afs = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(afs, atmosFS);
            gl.compileShader(afs);
            const aprog = gl.createProgram();
            gl.attachShader(aprog, avs);
            gl.attachShader(aprog, afs);
            gl.linkProgram(aprog);

            gl.useProgram(aprog);
            const amvpLoc = gl.getUniformLocation(aprog, 'uMVP');
            const alightLoc = gl.getUniformLocation(aprog, 'uLightDir');
            gl.uniformMatrix4fv(amvpLoc, false, mvpWithRot);
            gl.uniform3fv(alightLoc, lightDir);

            const aPosLoc = gl.getAttribLocation(aprog, 'aPos');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.atmosMesh.vbo);
            gl.enableVertexAttribArray(aPosLoc);
            gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.atmosMesh.ibo);
            gl.drawElements(gl.TRIANGLES, this.atmosMesh.count, gl.UNSIGNED_SHORT, 0);

            gl.deleteProgram(aprog);
        }

        // === Draw Moon ===
        if (this.moonProg && this.moonMesh) {
            const moonDist = 6.5;
            const moonAngle = this.moonAngle || 0;
            const moonX = moonDist * Math.cos(moonAngle);
            const moonZ = moonDist * Math.sin(moonAngle);
            const moonY = 0.5 * Math.sin(moonAngle * 0.5);
            const moonScale = 0.25;
            const moonModel = new Float32Array([
                moonScale, 0, 0, 0,
                0, moonScale, 0, 0,
                0, 0, moonScale, 0,
                moonX, moonY, moonZ, 1
            ]);
            const moonMvp = this._mat4Multiply(pv, moonModel);
            gl.useProgram(this.moonProg);
            const mmvpLoc = gl.getUniformLocation(this.moonProg, 'uMVP');
            gl.uniformMatrix4fv(mmvpLoc, false, moonMvp);
            const mPosLoc = gl.getAttribLocation(this.moonProg, 'aPos');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.moonMesh.vbo);
            gl.enableVertexAttribArray(mPosLoc);
            gl.vertexAttribPointer(mPosLoc, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.moonMesh.ibo);
            gl.depthMask(true);
            gl.drawElements(gl.TRIANGLES, this.moonMesh.count, gl.UNSIGNED_SHORT, 0);
        }

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
    }

    _drawFallback(ctx) {
        // Simple colored circle fallback
        const cx = ctx.canvas.width / 2;
        const cy = ctx.canvas.height / 2;
        const r = Math.min(cx, cy) * 0.7;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, '#1a4a8a');
        grad.addColorStop(0.5, '#0d2d5a');
        grad.addColorStop(1, '#061428');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        const glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.2);
        glow.addColorStop(0, 'rgba(100, 150, 255, 0.3)');
        glow.addColorStop(1, 'rgba(100, 150, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
        ctx.fill();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const benchmark = new GPUBenchmark();
    window.benchmark = benchmark;

    const gpuInfo = benchmark.detectGPUInfo();
    const extensions = benchmark.checkExtensions();

    // GPU 信息面板
    const contentZone = document.querySelector('.content-zone');
    const gpuInfoPanel = document.createElement('div');
    gpuInfoPanel.className = 'gpu-info-panel';
    gpuInfoPanel.innerHTML =
        '<div class="gpu-info-card"><div class="gpu-info-icon">🖥️</div><div class="gpu-info-label">GPU 厂商</div><div class="gpu-info-value">' + gpuInfo.vendor + '</div></div>' +
        '<div class="gpu-info-card"><div class="gpu-info-icon">📋</div><div class="gpu-info-label">GPU 型号</div><div class="gpu-info-value">' + gpuInfo.renderer + '</div></div>' +
        '<div class="gpu-info-card"><div class="gpu-info-icon">🔌</div><div class="gpu-info-label">WebGL 版本</div><div class="gpu-info-value">' + gpuInfo.version + '</div></div>' +
        '<div class="gpu-info-card"><div class="gpu-info-icon">📏</div><div class="gpu-info-label">最大纹理</div><div class="gpu-info-value">' + gpuInfo.maxTextureSize + ' px</div></div>' +
        '<div class="gpu-info-card extensions-card" id="extensionsCard"><div class="gpu-info-icon">🔧</div><div class="gpu-info-label">支持扩展</div><div class="gpu-info-value">' + extensions.length + ' 个</div></div>';
    contentZone.insertBefore(gpuInfoPanel, contentZone.firstChild);

    // Extensions Modal
    const extModal = document.getElementById('extModal');
    const extModalGrid = document.getElementById('extModalGrid');
    extModalGrid.innerHTML = extensions.length > 0 ? extensions.map(e => '<span class="ext-tag">' + e + '</span>').join('') : '<span class="ext-tag">无</span>';
    document.getElementById('extensionsCard').addEventListener('click', () => { extModal.classList.add('active'); });
    document.getElementById('extModalClose').addEventListener('click', () => { extModal.classList.remove('active'); });
    document.getElementById('extModalBackdrop').addEventListener('click', () => { extModal.classList.remove('active'); });

    // 开始按钮
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    startBtn.addEventListener('click', () => {
        startBtn.disabled = true;
        resetBtn.disabled = false;
        startBtn.textContent = '🚀 测试中...';
        benchmark.startFullBenchmark();
    });
    resetBtn.addEventListener('click', () => {
        benchmark.abortBenchmark();
    });

    // 全屏画布自适应
    window.addEventListener('resize', () => {
        const fsCanvas = document.getElementById('fsCanvas');
        if (fsCanvas && benchmark.isFullscreen) {
            fsCanvas.width = window.innerWidth;
            fsCanvas.height = window.innerHeight;
        }
    });
});
