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

        // v2.0: 多场景结果
        this.sceneResults = [];  // [{scene, avgFPS, minFPS, score}, ...]
        this.currentSceneIdx = 0;
        this.allScenes = [
            { id: 'particles', label: '💥 粒子爆炸', icon: '💥' },
            { id: 'matrix',    label: '🟢 矩阵雨',    icon: '🟢' },
            { id: 'earth',     label: '🌍 粒子地球',   icon: '🌍' }
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
            // Clear canvas completely before starting new scene
            // This ensures no leftover content from previous scene (critical for earth WebGL scene)
            try {
                const tmpCtx = canvas.getContext('2d');
                if (tmpCtx) {
                    tmpCtx.setTransform(1, 0, 0, 1, 0, 0);
                    tmpCtx.clearRect(0, 0, canvas.width, canvas.height);
                }
            } catch(e) {}

            // Only get 2D context for 2D scenes (not earth which needs WebGL)
            const isEarth = sceneId === 'earth';
            const ctx = isEarth ? null : canvas.getContext('2d');
            const W = canvas.width, H = canvas.height;

            switch (sceneId) {
                case 'particles': this.sceneInstance = new ParticleSceneV2(ctx, W, H); break;
                case 'matrix':    this.sceneInstance = new MatrixRainSceneV2(ctx, W, H); break;
                case 'earth':     this.sceneInstance = new ParticleEarthScene(canvas, W, H); break;
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
                    this.sceneInstance.update(frameTime);
                    this.sceneInstance.draw();
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
                this.sceneInstance.update(frameTime);
                this.sceneInstance.draw();

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

    /* 场景切换闪光 */
    flashTransition() {
        return new Promise((resolve) => {
            const flash = document.getElementById('sceneFlash');
            if (!flash) { resolve(); return; }
            flash.style.opacity = '1';
            flash.style.transition = 'none';
            requestAnimationFrame(() => {
                flash.style.transition = 'opacity 0.5s ease-out';
                flash.style.opacity = '0';
            });
            setTimeout(resolve, 600);
        });
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

        const sceneLabels = { particles: '💥 粒子爆炸', matrix: '🟢 矩阵雨', earth: '🌍 粒子地球' };

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

/* ======================= 场景: 粒子爆炸 V2 ======================= */
class ParticleSceneV2 {
    constructor(ctx, w, h) {
        this.ctx = ctx;
        this.W = w;
        this.H = h;
        this.count = 3000;
        this.particles = [];
        this.stars = [];
        this.shakeX = 0;
        this.shakeY = 0;
        this.trails = []; // 拖尾
        this.init();
    }
    init() {
        const cx = this.W / 2, cy = this.H / 2;
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 10;
            const hue = Math.random() * 360;
            this.particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: 1.5 + Math.random() * 3,
                life: 1.0,
                decay: 0.003 + Math.random() * 0.005,
                hue,
                trail: []
            });
        }
        // 背景星点
        this.stars = Array.from({ length: 200 }, () => ({
            x: Math.random() * this.W, y: Math.random() * this.H,
            r: Math.random() * 1.5,
            alpha: 0.3 + Math.random() * 0.5
        }));
    }
    stop() {}
    update(dt) {
        const k = dt / 16;
        // 震屏
        this.shakeX = (Math.random() - 0.5) * 6;
        this.shakeY = (Math.random() - 0.5) * 6;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            // 拖尾记录
            p.trail.push({ x: p.x, y: p.y, life: p.life });
            if (p.trail.length > 5) p.trail.shift();

            p.x += p.vx * k;
            p.y += p.vy * k;
            p.vy += 0.08 * k; // 重力
            p.vx *= 0.995;
            p.vy *= 0.995;
            p.life -= p.decay * k;

            if (p.life <= 0) {
                // 中心重置
                p.x = this.W / 2; p.y = this.H / 2;
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 10;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = 1.0;
                p.trail = [];
            }
        }
    }
    draw() {
        const c = this.ctx;
        // 震屏
        c.save();
        c.translate(this.shakeX, this.shakeY);

        // 深空背景
        c.fillStyle = '#050510';
        c.fillRect(-10, -10, this.W + 20, this.H + 20);

        // 星点
        for (const s of this.stars) {
            c.globalAlpha = s.alpha;
            c.fillStyle = '#fff';
            c.beginPath();
            c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            c.fill();
        }
        c.globalAlpha = 1;

        // 拖尾
        for (const p of this.particles) {
            for (let t = 0; t < p.trail.length; t++) {
                const tr = p.trail[t];
                const alpha = (t / p.trail.length) * 0.3 * p.life;
                const r = p.r * (t / p.trail.length) * 0.8;
                c.globalAlpha = alpha;
                c.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
                c.shadowBlur = 8;
                c.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
                c.beginPath();
                c.arc(tr.x, tr.y, r, 0, Math.PI * 2);
                c.fill();
            }
        }
        c.shadowBlur = 0;

        // 粒子主体（发光）
        for (const p of this.particles) {
            c.globalAlpha = p.life;
            c.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
            c.shadowBlur = 15;
            c.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
            c.beginPath();
            c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            c.fill();

            // 中心白核
            if (p.life > 0.7) {
                c.globalAlpha = (p.life - 0.7) / 0.3;
                c.fillStyle = '#fff';
                c.beginPath();
                c.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
                c.fill();
            }
        }
        c.shadowBlur = 0;
        c.globalAlpha = 1;
        c.restore();
    }
}

/* ======================= 场景: 矩阵雨 V2 ======================= */
class MatrixRainSceneV2 {
    constructor(ctx, w, h) {
        this.ctx = ctx;
        this.W = w;
        this.H = h;
        this.cols = Math.floor(w / 18);
        this.drops = [];
        this.chaosParticles = []; // 叠加混沌粒子
        this.init();
    }
    init() {
        this.drops = [];
        for (let i = 0; i < this.cols; i++) {
            this.drops.push({
                y: Math.random() * this.H,
                speed: 3 + Math.random() * 6,
                chars: Array(Math.floor(this.H / 18)).fill(0).map(() => this.mkChar()),
                bright: Math.random() < 0.05 // 高亮字符
            });
        }
        // 混沌粒子
        this.chaosParticles = Array.from({ length: 200 }, () => this.mkChaos());
    }
    mkChar() {
        return '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 36)];
    }
    mkChaos() {
        return {
            x: Math.random() * this.W,
            y: Math.random() * this.H,
            vx: (Math.random() - 0.5) * 2,
            vy: 1 + Math.random() * 3,
            r: 1 + Math.random() * 2,
            life: 1,
            decay: 0.01 + Math.random() * 0.02,
            hue: Math.random() < 0.3 ? 120 : (Math.random() < 0.5 ? 280 : 50)
        };
    }
    stop() {}
    update(dt) {
        const k = dt / 16;
        for (const d of this.drops) {
            d.y += d.speed * k;
            if (d.y * 18 > this.H) {
                d.y = 0;
                d.chars = Array(Math.floor(this.H / 18)).fill(0).map(() => this.mkChar());
                d.bright = Math.random() < 0.05;
            }
        }
        // 更新混沌粒子
        for (let i = 0; i < this.chaosParticles.length; i++) {
            const p = this.chaosParticles[i];
            p.x += p.vx * k;
            p.y += p.vy * k;
            p.life -= p.decay * k;
            if (p.life <= 0 || p.y > this.H) {
                this.chaosParticles[i] = this.mkChaos();
                this.chaosParticles[i].y = -10;
            }
        }
    }
    draw() {
        const c = this.ctx;
        c.fillStyle = 'rgba(0, 0, 10, 0.08)';
        c.fillRect(0, 0, this.W, this.H);

        c.font = 'bold 16px monospace';

        // 主字符雨
        for (let i = 0; i < this.drops.length; i++) {
            const d = this.drops[i];
            const x = i * 18;

            for (let j = 0; j < d.chars.length; j++) {
                const charY = d.y * 18 - j * 18;
                if (charY < 0 || charY > this.H) continue;

                const alpha = 1 - (charY / this.H) * 0.8;
                const isHead = j === Math.floor(d.y) % d.chars.length;

                if (isHead) {
                    // 头部高亮白色
                    c.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    c.shadowBlur = 10;
                    c.shadowColor = '#0f0';
                } else {
                    c.fillStyle = `rgba(0, ${180 + Math.random() * 75}, 0, ${alpha * 0.8})`;
                    c.shadowBlur = 0;
                }
                c.fillText(d.chars[j], x, charY);
            }
            c.shadowBlur = 0;
        }

        // 混沌粒子（彩色雾气）
        for (const p of this.chaosParticles) {
            c.globalAlpha = p.life * 0.6;
            c.fillStyle = `hsl(${p.hue}, 80%, 60%)`;
            c.shadowBlur = 6;
            c.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
            c.beginPath();
            c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            c.fill();
        }
        c.shadowBlur = 0;
        c.globalAlpha = 1;

        // 暗角
        const vig = c.createRadialGradient(this.W/2, this.H/2, this.H*0.3, this.W/2, this.H/2, this.H*0.8);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,10,0.5)');
        c.fillStyle = vig;
        c.fillRect(0, 0, this.W, this.H);
    }
}

/* ======================= 场景: WebGL 3D 地球 ======================= */
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

        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
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

        // Fragment shader - terrain + lighting + clouds + atmosphere + aurora
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

            void main() {
                vec3 n = normalize(vPos);
                // spherical UV to lat/lon
                float lat = asin(n.y) * 0.3183; // -1 to 1 -> -0.5pi to 0.5pi scaled
                float lon = atan(n.z, n.x) * 0.3183;

                // Terrain color: fbm noise
                float elev = fbm(vec2(lon * 4.0 + 100.0, lat * 4.0));
                float isLand = step(0.48, elev);
                vec3 ocean = mix(vec3(0.05, 0.15, 0.45), vec3(0.1, 0.3, 0.7), fbm(vec2(lon*8.0+50.0, lat*8.0)));
                vec3 land = mix(vec3(0.1, 0.35, 0.05), vec3(0.45, 0.35, 0.2), fbm(vec2(lon*2.0, lat*2.0+200.0)));
                vec3 terrain = mix(ocean, land, isLand);

                // Ice caps
                float ice = smoothstep(0.82, 0.95, abs(n.y));
                terrain = mix(terrain, vec3(0.9, 0.95, 1.0), ice);

                // Lighting: sun from direction uLightDir
                vec3 L = normalize(uLightDir);
                float diff = max(dot(n, L), 0.0);
                float ambient = 0.08;
                vec3 lit = terrain * (ambient + diff * 0.9);

                // Night side: city lights
                float night = 1.0 - smoothstep(-0.1, 0.1, diff);
                float cityNoise = fbm(vec2(lon * 12.0 + 300.0, lat * 12.0));
                float cities = step(0.65, cityNoise) * isLand * night * 0.6;
                vec3 cityColor = vec3(1.0, 0.8, 0.4);
                lit += cities * cityColor;

                // Clouds
                float cloud = texture2D(uCloudTex, vec2(vUV.x + uTime * 0.003, vUV.y)).r;
                cloud = smoothstep(0.4, 0.7, cloud);
                // Clouds are lit from sun side
                float cloudLit = max(dot(n, L), 0.0);
                vec3 cloudColor = mix(vec3(0.4, 0.4, 0.45), vec3(1.0, 1.0, 1.0), cloudLit * 0.5);
                lit = mix(lit, cloudColor, cloud * 0.85);

                // Atmosphere rim glow
                float rim = 1.0 - abs(dot(n, vec3(0.0, 1.0, 0.0)));
                rim = pow(rim, 3.0);
                float sunGlow = max(dot(n, L), 0.0);
                sunGlow = pow(sunGlow, 8.0);
                vec3 atmosColor = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.8, 0.3), sunGlow);
                lit += atmosColor * rim * 0.7;

                // Aurora at poles
                float auroraN = smoothstep(0.5, 0.98, n.y) * (1.0 - smoothstep(0.98, 1.0, n.y));
                float auroraS = smoothstep(0.5, 0.98, -n.y) * (1.0 - smoothstep(0.98, 1.0, -n.y));
                float auroraVal = auroraN + auroraS;
                if (auroraVal > 0.1) {
                    float aWave = sin(lon * 20.0 + uTime * 1.5) * 0.5 + 0.5;
                    aWave *= sin(lat * 10.0 + uTime * 0.8) * 0.5 + 0.5;
                    float auroraFade = night * 0.4 + 0.1;
                    vec3 auroraColor = mix(vec3(0.0, 1.0, 0.5), vec3(0.5, 0.0, 1.0), sin(uTime * 0.3 + lon * 5.0) * 0.5 + 0.5);
                    lit += auroraColor * auroraVal * aWave * auroraFade;
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
    }

    _buildMesh(gl, prog) {
        // UV sphere with lat/lon grid, no top/bottom caps
        const LAT_SEGS = 60, LON_SEGS = 120;
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
    }

    update(dt) {
        const k = dt / 16;
        this.time += dt;
        this.auroraPhase += 0.002 * k;
        // Slow rotation + camera bob
        this.rotation += 0.004 * k;
        this.cameraZ = Math.sin(this.time * 0.0004) * 0.3;
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

        // Camera
        const camR = 3.0 + this.cameraZ;
        const eye = [camR * Math.sin(this.rotation * 0.3), 0.5, camR * Math.cos(this.rotation * 0.3)];
        const proj = this._mat4Perspective(Math.PI / 4, W / H, 0.1, 100);
        const view = this._mat4LookAt(eye, [0, 0, 0], [0, 1, 0]);
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
