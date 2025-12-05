/* =====================================================
   🎵 SONIC DIMENSION - Premium Audio Visualizer
   Équipe MAX 100% - Nuit de l'Info 2024
   
   PARTIE 1: Core System & Audio Engine
   ===================================================== */

class SonicDimension {
    constructor() {
        // Canvas elements
        this.canvas2D = document.getElementById('visualizer2D');
        this.canvas3D = document.getElementById('visualizer3D');
        this.waveformCanvas = document.getElementById('waveformCanvas');
        this.spectrumCanvas = document.getElementById('spectrumMini');
        this.particleBg = document.getElementById('particleBackground');
        
        // Contexts
        this.ctx = this.canvas2D.getContext('2d');
        this.waveCtx = this.waveformCanvas.getContext('2d');
        this.specCtx = this.spectrumCanvas.getContext('2d');
        this.bgCtx = this.particleBg.getContext('2d');
        
        // Audio
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.audioElement = document.getElementById('audioElement');
        this.microphone = null;
        
        // State
        this.isPlaying = false;
        this.isMicActive = false;
        this.currentMode = 'nebula';
        this.currentTheme = 'cyberpunk';
        
        // Settings
        this.settings = {
            sensitivity: 2,
            speed: 1,
            bloom: 50,
            autoRotate: true,
            beatReact: true,
            mirror: false
        };
        
        // Time & Animation
        this.time = 0;
        this.lastBeat = 0;
        this.beatThreshold = 0.8;
        
        // FPS Counter
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        
        // Rainbow mode
        this.rainbowMode = false;
        this.rainbowHue = 0;
        
        // Pulse mode
        this.pulseMode = false;
        
        // Beat history for better detection
        this.beatHistory = [];
        this.beatHistorySize = 43; // ~1 second at 60fps
        
        // Themes
        this.themes = {
            cyberpunk: { primary: '#ff00ff', secondary: '#00ffff', tertiary: '#ffff00', bg: '#0a0a15' },
            aurora: { primary: '#00ff87', secondary: '#60efff', tertiary: '#a855f7', bg: '#0a1a1a' },
            sunset: { primary: '#ff416c', secondary: '#ff4b2b', tertiary: '#ffd700', bg: '#1a0a0a' },
            ocean: { primary: '#0077b6', secondary: '#00b4d8', tertiary: '#90e0ef', bg: '#0a0a1a' },
            royal: { primary: '#7b2cbf', secondary: '#c77dff', tertiary: '#e0aaff', bg: '#0f0a1a' },
            fire: { primary: '#ff0000', secondary: '#ff7700', tertiary: '#ffcc00', bg: '#1a0500' },
            matrix: { primary: '#00ff00', secondary: '#00cc00', tertiary: '#009900', bg: '#000500' },
            gold: { primary: '#ffd700', secondary: '#f4a460', tertiary: '#daa520', bg: '#1a1500' },
            neon: { primary: '#ff1493', secondary: '#00ff7f', tertiary: '#ff6347', bg: '#0a0510' },
            ice: { primary: '#e0ffff', secondary: '#87ceeb', tertiary: '#4169e1', bg: '#0a0a1a' }
        };
        
        // 3D Scene (Three.js)
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles3D = null;
        
        // Visualization data
        this.bgParticles = [];
        this.visualData = {
            frequency: new Uint8Array(256),
            waveform: new Uint8Array(256),
            bass: 0,
            mid: 0,
            treble: 0,
            average: 0
        };
        
        // Konami Code Easter Egg
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.konamiIndex = 0;
        
        this.init();
    }

    // =====================================================
    // INITIALIZATION
    // =====================================================
    
    init() {
        this.resizeCanvases();
        this.initBackgroundParticles();
        this.init3DScene();
        this.setupEventListeners();
        this.hideLoadingScreen();
        this.animate();
    }
    
    resizeCanvases() {
        const resize = (canvas, container) => {
            if (!canvas) return;
            const parent = container || canvas.parentElement;
            if (!parent) return;
            canvas.width = parent.clientWidth || 800;
            canvas.height = parent.clientHeight || 500;
        };
        
        resize(this.canvas2D);
        resize(this.canvas3D);
        resize(this.waveformCanvas);
        resize(this.spectrumCanvas);
        
        if (this.particleBg) {
            this.particleBg.width = window.innerWidth;
            this.particleBg.height = window.innerHeight;
        }
        
        window.addEventListener('resize', () => {
            resize(this.canvas2D);
            resize(this.canvas3D);
            resize(this.waveformCanvas);
            resize(this.spectrumCanvas);
            if (this.particleBg) {
                this.particleBg.width = window.innerWidth;
                this.particleBg.height = window.innerHeight;
            }
            if (this.renderer && this.canvas3D) {
                this.renderer.setSize(this.canvas3D.width, this.canvas3D.height);
            }
        });
    }
    
    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
        }, 2500);
    }
    
    // =====================================================
    // AUDIO ENGINE
    // =====================================================
    
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.8;
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    loadAudioFile(file) {
        if (!file) return;
        
        this.initAudioContext();
        this.stop();
        
        const url = URL.createObjectURL(file);
        this.audioElement.src = url;
        
        // Only create MediaElementSource once
        if (!this.source) {
            this.source = this.audioContext.createMediaElementSource(this.audioElement);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        }
        
        document.getElementById('trackName').textContent = '🎵 ' + file.name;
        this.enablePlayback();
        this.play();
    }
    
    async toggleMicrophone() {
        if (this.isMicActive) {
            this.stopMicrophone();
            return;
        }
        
        try {
            this.initAudioContext();
            this.stop();
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            this.isMicActive = true;
            this.isPlaying = true;
            
            document.getElementById('micBtn').classList.add('active');
            document.getElementById('trackName').textContent = '🎤 Microphone Live';
            document.getElementById('vinylRecord').classList.add('playing');
            
        } catch (err) {
            console.error('Microphone error:', err);
            alert('Impossible d\'accéder au microphone');
        }
    }
    
    stopMicrophone() {
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        this.isMicActive = false;
        document.getElementById('micBtn').classList.remove('active');
    }
    
    playSynthwave() {
        this.initAudioContext();
        this.stop();
        
        // Create rich synthwave sound
        const now = this.audioContext.currentTime;
        const duration = 15;
        
        // Bass
        const bass = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(55, now);
        bass.frequency.exponentialRampToValueAtTime(110, now + 2);
        bass.frequency.exponentialRampToValueAtTime(55, now + 4);
        bass.frequency.setValueAtTime(73, now + 4);
        bass.frequency.exponentialRampToValueAtTime(146, now + 6);
        bassGain.gain.setValueAtTime(0.3, now);
        bass.connect(bassGain);
        bassGain.connect(this.analyser);
        
        // Lead
        const lead = this.audioContext.createOscillator();
        const leadGain = this.audioContext.createGain();
        const leadFilter = this.audioContext.createBiquadFilter();
        lead.type = 'square';
        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(800, now);
        leadFilter.frequency.exponentialRampToValueAtTime(3000, now + 4);
        leadFilter.frequency.exponentialRampToValueAtTime(500, now + 8);
        
        // Arpeggio
        const notes = [220, 277, 330, 440, 330, 277, 220, 165];
        notes.forEach((freq, i) => {
            lead.frequency.setValueAtTime(freq, now + i * 0.25);
        });
        lead.frequency.setValueAtTime(220, now + 2);
        
        leadGain.gain.setValueAtTime(0.15, now);
        lead.connect(leadFilter);
        leadFilter.connect(leadGain);
        leadGain.connect(this.analyser);
        
        // Pad
        const pad = this.audioContext.createOscillator();
        const padGain = this.audioContext.createGain();
        pad.type = 'sine';
        pad.frequency.setValueAtTime(440, now);
        padGain.gain.setValueAtTime(0.1, now);
        padGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        pad.connect(padGain);
        padGain.connect(this.analyser);
        
        this.analyser.connect(this.audioContext.destination);
        
        bass.start(now);
        lead.start(now);
        pad.start(now);
        
        bass.stop(now + duration);
        lead.stop(now + duration);
        pad.stop(now + duration);
        
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        leadGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        this.isPlaying = true;
        document.getElementById('trackName').textContent = '🎹 Synthwave Demo';
        document.getElementById('vinylRecord').classList.add('playing');
        
        setTimeout(() => {
            this.isPlaying = false;
            document.getElementById('vinylRecord').classList.remove('playing');
            document.getElementById('trackName').textContent = 'Demo terminée';
        }, duration * 1000);
    }
    
    enablePlayback() {
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('stopBtn').disabled = false;
    }
    
    play() {
        if (this.audioElement.src && this.audioContext) {
            this.audioContext.resume();
            this.audioElement.play();
            this.isPlaying = true;
            document.getElementById('vinylRecord').classList.add('playing');
        }
    }
    
    pause() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.isPlaying = false;
            document.getElementById('vinylRecord').classList.remove('playing');
        }
    }
    
    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        this.stopMicrophone();
        this.isPlaying = false;
        const vinyl = document.getElementById('vinylRecord');
        const progress = document.getElementById('audioProgress');
        if (vinyl) vinyl.classList.remove('playing');
        if (progress) progress.style.width = '0%';
    }
    
    // =====================================================
    // AUDIO DATA PROCESSING
    // =====================================================
    
    getAudioData() {
        if (!this.analyser) return;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const frequencyData = new Uint8Array(bufferLength);
        const waveformData = new Uint8Array(bufferLength);
        
        this.analyser.getByteFrequencyData(frequencyData);
        this.analyser.getByteTimeDomainData(waveformData);
        
        // Calculate frequency bands
        const bassEnd = Math.floor(bufferLength * 0.1);
        const midEnd = Math.floor(bufferLength * 0.5);
        
        let bassSum = 0, midSum = 0, trebleSum = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            if (i < bassEnd) bassSum += frequencyData[i];
            else if (i < midEnd) midSum += frequencyData[i];
            else trebleSum += frequencyData[i];
        }
        
        this.visualData = {
            frequency: frequencyData,
            waveform: waveformData,
            bass: (bassSum / bassEnd) / 255 * this.settings.sensitivity,
            mid: (midSum / (midEnd - bassEnd)) / 255 * this.settings.sensitivity,
            treble: (trebleSum / (bufferLength - midEnd)) / 255 * this.settings.sensitivity,
            average: frequencyData.reduce((a, b) => a + b, 0) / bufferLength / 255 * this.settings.sensitivity
        };
        
        // Update beat history for smarter detection
        this.beatHistory.push(this.visualData.bass);
        if (this.beatHistory.length > this.beatHistorySize) {
            this.beatHistory.shift();
        }
        
        // Calculate dynamic threshold
        const avgBeat = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
        const dynamicThreshold = Math.max(avgBeat * 1.3, 0.5);
        
        // Update UI stats
        this.updateStats();
        
        // Beat detection with dynamic threshold
        if (this.visualData.bass > dynamicThreshold && this.time - this.lastBeat > 10) {
            this.onBeat();
            this.lastBeat = this.time;
        }
    }
    
    updateStats() {
        const freqEl = document.getElementById('freqValue');
        const bassEl = document.getElementById('bassBar');
        const trebleEl = document.getElementById('trebleBar');
        const bpmEl = document.getElementById('bpmValue');
        
        if (freqEl) freqEl.textContent = Math.floor(this.visualData.average * 1000) + ' Hz';
        if (bassEl) bassEl.style.setProperty('--level', (this.visualData.bass * 100) + '%');
        if (trebleEl) trebleEl.style.setProperty('--level', (this.visualData.treble * 100) + '%');
        
        // Better BPM estimation based on beat history
        if (bpmEl && this.beatHistory.length > 20) {
            const peaks = this.beatHistory.filter(v => v > 0.5).length;
            const estimatedBPM = Math.floor((peaks / this.beatHistory.length) * 60 * 60);
            bpmEl.textContent = Math.min(180, Math.max(60, estimatedBPM));
        }
    }
    
    onBeat() {
        if (!this.settings.beatReact) return;
        
        // Flash effect on beat
        const wrapper = document.querySelector('.visualizer-wrapper');
        if (wrapper) {
            wrapper.style.boxShadow = `0 0 100px ${this.getThemeColor('primary')}`;
            setTimeout(() => {
                wrapper.style.boxShadow = '';
            }, 100);
        }
        
        // Beat indicator
        const beatIndicator = document.getElementById('beatIndicator');
        if (beatIndicator) {
            beatIndicator.classList.add('active');
            setTimeout(() => beatIndicator.classList.remove('active'), 150);
        }
        
        // Screen pulse on strong beats
        if (this.visualData.bass > 1.2) {
            document.body.classList.add('beat-flash');
            setTimeout(() => document.body.classList.remove('beat-flash'), 100);
        }
    }
    
    // =====================================================
    // NEW EFFECTS
    // =====================================================
    
    toggleRainbow() {
        this.rainbowMode = !this.rainbowMode;
        const btn = document.getElementById('rainbowBtn');
        if (btn) btn.classList.toggle('active', this.rainbowMode);
        if (!this.rainbowMode) {
            document.body.style.filter = '';
        }
    }
    
    togglePulse() {
        this.pulseMode = !this.pulseMode;
        const btn = document.getElementById('pulseBtn');
        if (btn) btn.classList.toggle('active', this.pulseMode);
        if (!this.pulseMode) {
            document.querySelector('.visualizer-wrapper').style.transform = '';
        }
    }
    
    // =====================================================
    // EVENT LISTENERS
    // =====================================================
    
    setupEventListeners() {
        // Audio input
        document.getElementById('audioFile').addEventListener('change', (e) => {
            this.loadAudioFile(e.target.files[0]);
        });
        
        document.getElementById('micBtn').addEventListener('click', () => {
            this.toggleMicrophone();
        });
        
        document.getElementById('demoBtn').addEventListener('click', () => {
            this.playSynthwave();
        });
        
        // Playback
        document.getElementById('playBtn').addEventListener('click', () => this.play());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        
        // Audio element events
        this.audioElement.addEventListener('timeupdate', () => {
            if (this.audioElement.duration) {
                const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100;
                document.getElementById('audioProgress').style.width = progress + '%';
                document.getElementById('currentTime').textContent = this.formatTime(this.audioElement.currentTime);
                document.getElementById('duration').textContent = this.formatTime(this.audioElement.duration);
            }
        });
        
        // Progress click
        document.querySelector('.progress-track').addEventListener('click', (e) => {
            if (this.audioElement.duration) {
                const rect = e.target.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.audioElement.currentTime = percent * this.audioElement.duration;
            }
        });
        
        // Mode buttons
        document.querySelectorAll('.mode-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-card').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMode = btn.dataset.mode;
                document.getElementById('currentModeName').textContent = btn.querySelector('.mode-name').textContent;
            });
        });
        
        // Theme buttons
        document.querySelectorAll('.theme-orb').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.theme-orb').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTheme = btn.dataset.theme;
                this.applyTheme();
            });
        });
        
        // Sliders
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.audioElement.volume = e.target.value / 100;
            document.getElementById('volumeValue').textContent = e.target.value + '%';
        });
        
        document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
            this.settings.sensitivity = parseFloat(e.target.value);
            document.getElementById('sensitivityValue').textContent = e.target.value + 'x';
        });
        
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.settings.speed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = e.target.value + 'x';
        });
        
        document.getElementById('bloomSlider').addEventListener('input', (e) => {
            this.settings.bloom = parseInt(e.target.value);
            document.getElementById('bloomValue').textContent = e.target.value + '%';
        });
        
        // Toggles
        document.getElementById('autoRotate').addEventListener('change', (e) => {
            this.settings.autoRotate = e.target.checked;
        });
        
        document.getElementById('beatReact').addEventListener('change', (e) => {
            this.settings.beatReact = e.target.checked;
        });
        
        document.getElementById('mirrorMode').addEventListener('change', (e) => {
            this.settings.mirror = e.target.checked;
        });
        
        // Effects
        document.getElementById('flashBtn').addEventListener('click', () => this.flashEffect());
        document.getElementById('shakeBtn').addEventListener('click', () => this.shakeEffect());
        document.getElementById('explosionBtn').addEventListener('click', () => this.explosionEffect());
        document.getElementById('screenshotBtn').addEventListener('click', () => this.takeScreenshot());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('randomBtn').addEventListener('click', () => this.randomMode());
        
        // New Effects
        const rainbowBtn = document.getElementById('rainbowBtn');
        if (rainbowBtn) {
            rainbowBtn.addEventListener('click', () => this.toggleRainbow());
        }
        
        const pulseBtn = document.getElementById('pulseBtn');
        if (pulseBtn) {
            pulseBtn.addEventListener('click', () => this.togglePulse());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    handleKeyboard(e) {
        // Konami Code
        if (e.key === this.konamiCode[this.konamiIndex]) {
            this.konamiIndex++;
            if (this.konamiIndex === this.konamiCode.length) {
                this.activateEasterEgg();
                this.konamiIndex = 0;
            }
        } else {
            this.konamiIndex = 0;
        }
        
        // Shortcuts
        switch(e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                this.isPlaying ? this.pause() : this.play();
                break;
            case 'f':
                this.toggleFullscreen();
                break;
            case 's':
                this.takeScreenshot();
                break;
            case 'r':
                this.randomMode();
                break;
            case 'arrowup':
                e.preventDefault();
                this.audioElement.volume = Math.min(1, this.audioElement.volume + 0.1);
                document.getElementById('volumeSlider').value = this.audioElement.volume * 100;
                document.getElementById('volumeValue').textContent = Math.round(this.audioElement.volume * 100) + '%';
                break;
            case 'arrowdown':
                e.preventDefault();
                this.audioElement.volume = Math.max(0, this.audioElement.volume - 0.1);
                document.getElementById('volumeSlider').value = this.audioElement.volume * 100;
                document.getElementById('volumeValue').textContent = Math.round(this.audioElement.volume * 100) + '%';
                break;
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
                const modeCards = document.querySelectorAll('.mode-card');
                const index = parseInt(e.key) - 1;
                if (modeCards[index]) {
                    modeCards[index].click();
                }
                break;
        }
    }
    
    // =====================================================
    // EFFECTS
    // =====================================================
    
    flashEffect() {
        document.body.classList.add('flash-effect');
        setTimeout(() => document.body.classList.remove('flash-effect'), 300);
    }
    
    shakeEffect() {
        document.querySelector('.visualizer-wrapper').classList.add('shake');
        setTimeout(() => document.querySelector('.visualizer-wrapper').classList.remove('shake'), 500);
    }
    
    explosionEffect() {
        // Create explosion particles
        for (let i = 0; i < 50; i++) {
            this.bgParticles.push({
                x: this.canvas2D.width / 2,
                y: this.canvas2D.height / 2,
                vx: (Math.random() - 0.5) * 30,
                vy: (Math.random() - 0.5) * 30,
                size: Math.random() * 10 + 5,
                life: 1,
                color: this.getThemeColor('primary')
            });
        }
        this.flashEffect();
        this.shakeEffect();
    }
    
    takeScreenshot() {
        const link = document.createElement('a');
        link.download = 'sonic-dimension-' + Date.now() + '.png';
        link.href = this.canvas2D.toDataURL();
        link.click();
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.querySelector('.visualizer-wrapper').requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    randomMode() {
        const modes = document.querySelectorAll('.mode-card');
        const randomIndex = Math.floor(Math.random() * modes.length);
        modes[randomIndex].click();
        
        const themes = document.querySelectorAll('.theme-orb');
        const randomTheme = Math.floor(Math.random() * themes.length);
        themes[randomTheme].click();
    }
    
    activateEasterEgg() {
        const egg = document.getElementById('easterEgg');
        egg.classList.remove('hidden');
        
        // Rainbow mode
        document.body.style.animation = 'rainbow 2s linear infinite';
        
        setTimeout(() => {
            egg.classList.add('hidden');
            document.body.style.animation = '';
        }, 5000);
    }
    
    // =====================================================
    // UTILITIES
    // =====================================================
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    getThemeColor(type) {
        return this.themes[this.currentTheme][type];
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
    
    applyTheme() {
        const theme = this.themes[this.currentTheme];
        document.documentElement.style.setProperty('--primary', theme.primary);
        document.documentElement.style.setProperty('--secondary', theme.secondary);
        document.documentElement.style.setProperty('--tertiary', theme.tertiary);
        document.documentElement.style.setProperty('--bg-dark', theme.bg);
    }
    
    // =====================================================
    // BACKGROUND PARTICLES
    // =====================================================
    
    initBackgroundParticles() {
        this.bgParticles = [];
        for (let i = 0; i < 100; i++) {
            this.bgParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                life: 1,
                color: null
            });
        }
    }
    
    drawBackgroundParticles() {
        this.bgCtx.fillStyle = 'rgba(10, 10, 15, 0.1)';
        this.bgCtx.fillRect(0, 0, this.particleBg.width, this.particleBg.height);
        
        const theme = this.themes[this.currentTheme];
        const intensity = this.visualData.average || 0.1;
        
        this.bgParticles.forEach((p, i) => {
            // Update
            p.x += p.vx * (1 + intensity * 2);
            p.y += p.vy * (1 + intensity * 2);
            
            // Wrap
            if (p.x < 0) p.x = this.particleBg.width;
            if (p.x > this.particleBg.width) p.x = 0;
            if (p.y < 0) p.y = this.particleBg.height;
            if (p.y > this.particleBg.height) p.y = 0;
            
            // Handle explosion particles
            if (p.life < 1) {
                p.life -= 0.02;
                p.size *= 0.95;
                if (p.life <= 0) {
                    this.bgParticles.splice(i, 1);
                    return;
                }
            }
            
            // Draw
            this.bgCtx.beginPath();
            this.bgCtx.arc(p.x, p.y, p.size * (1 + intensity), 0, Math.PI * 2);
            this.bgCtx.fillStyle = p.color || (i % 2 === 0 ? theme.primary : theme.secondary);
            this.bgCtx.globalAlpha = p.life * 0.5;
            this.bgCtx.fill();
            this.bgCtx.globalAlpha = 1;
        });
    }

    // =====================================================
    // 3D SCENE (Three.js)
    // =====================================================
    
    init3DScene() {
        if (!window.THREE) {
            console.warn('Three.js not loaded');
            return;
        }
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.canvas3D.width / this.canvas3D.height, 0.1, 1000);
        this.camera.position.z = 50;
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas3D, 
            alpha: true,
            antialias: true 
        });
        this.renderer.setSize(this.canvas3D.width, this.canvas3D.height);
        this.renderer.setClearColor(0x000000, 0);
        
        // Create particle system
        this.create3DParticles();
    }
    
    create3DParticles() {
        const geometry = new THREE.BufferGeometry();
        const count = 5000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            // Sphere distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 20 + Math.random() * 20;
            
            positions[i] = r * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = r * Math.cos(phi);
            
            colors[i] = Math.random();
            colors[i + 1] = Math.random();
            colors[i + 2] = Math.random();
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        this.particles3D = new THREE.Points(geometry, material);
        this.scene.add(this.particles3D);
    }
    
    update3D() {
        if (!this.scene || !this.particles3D) return;
        
        const intensity = this.visualData.average || 0;
        
        // Rotate based on audio
        if (this.settings.autoRotate) {
            this.particles3D.rotation.y += 0.002 * this.settings.speed;
            this.particles3D.rotation.x += 0.001 * this.settings.speed;
        }
        
        // Scale based on bass
        const scale = 1 + this.visualData.bass * 0.3;
        this.particles3D.scale.set(scale, scale, scale);
        
        // Update particle positions based on frequency
        const positions = this.particles3D.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const freqIndex = (i / 3) % this.visualData.frequency.length;
            const freqValue = this.visualData.frequency[freqIndex] / 255;
            
            // Pulse effect
            const originalDist = Math.sqrt(
                positions[i] * positions[i] + 
                positions[i+1] * positions[i+1] + 
                positions[i+2] * positions[i+2]
            );
            
            if (originalDist > 0) {
                const newDist = 20 + freqValue * 15 * this.settings.sensitivity;
                const ratio = newDist / originalDist;
                positions[i] *= 0.95 + ratio * 0.05;
                positions[i+1] *= 0.95 + ratio * 0.05;
                positions[i+2] *= 0.95 + ratio * 0.05;
            }
        }
        this.particles3D.geometry.attributes.position.needsUpdate = true;
        
        // Update colors
        const colors = this.particles3D.geometry.attributes.color.array;
        const theme = this.themes[this.currentTheme];
        const primaryRgb = this.hexToRgb(theme.primary);
        const secondaryRgb = this.hexToRgb(theme.secondary);
        
        for (let i = 0; i < colors.length; i += 3) {
            const t = (Math.sin(this.time * 0.01 + i * 0.01) + 1) / 2;
            colors[i] = (primaryRgb.r / 255) * t + (secondaryRgb.r / 255) * (1 - t);
            colors[i + 1] = (primaryRgb.g / 255) * t + (secondaryRgb.g / 255) * (1 - t);
            colors[i + 2] = (primaryRgb.b / 255) * t + (secondaryRgb.b / 255) * (1 - t);
        }
        this.particles3D.geometry.attributes.color.needsUpdate = true;
        
        this.renderer.render(this.scene, this.camera);
    }

    // =====================================================
    // MAIN ANIMATION LOOP
    // =====================================================
    
    animate() {
        this.time += this.settings.speed;
        
        // FPS Counter
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            const fpsEl = document.getElementById('fpsCounter');
            if (fpsEl) {
                fpsEl.textContent = this.fps + ' FPS';
                fpsEl.style.color = this.fps >= 50 ? '#00ff00' : this.fps >= 30 ? '#ffff00' : '#ff0000';
            }
        }
        
        // Rainbow mode
        if (this.rainbowMode) {
            this.rainbowHue = (this.rainbowHue + 2) % 360;
            document.body.style.filter = `hue-rotate(${this.rainbowHue}deg)`;
        }
        
        // Pulse mode
        if (this.pulseMode && this.visualData.bass > 0.5) {
            const scale = 1 + this.visualData.bass * 0.05;
            document.querySelector('.visualizer-wrapper').style.transform = `scale(${scale})`;
        } else if (!this.pulseMode) {
            document.querySelector('.visualizer-wrapper').style.transform = '';
        }
        
        // Get audio data
        this.getAudioData();
        
        // Draw background particles
        this.drawBackgroundParticles();
        
        // Clear 2D canvas with fade
        const theme = this.themes[this.currentTheme];
        this.ctx.fillStyle = `rgba(10, 10, 15, 0.15)`;
        this.ctx.fillRect(0, 0, this.canvas2D.width, this.canvas2D.height);
        
        // Draw current visualization mode
        this.drawVisualization();
        
        // Draw waveform
        this.drawWaveform();
        
        // Draw mini spectrum
        this.drawMiniSpectrum();
        
        // Update 3D scene
        this.update3D();
        
        // Mirror effect
        if (this.settings.mirror) {
            this.applyMirror();
        }
        
        requestAnimationFrame(() => this.animate());
    }
    
    drawVisualization() {
        switch (this.currentMode) {
            case 'nebula': this.drawNebula(); break;
            case 'dna': this.drawDNA(); break;
            case 'blackhole': this.drawBlackHole(); break;
            case 'terrain': this.drawTerrain(); break;
            case 'galaxy': this.drawGalaxy(); break;
            case 'cube': this.drawHypercube(); break;
            case 'fire': this.drawFire(); break;
            case 'wave3d': this.drawWave3D(); break;
            case 'tunnel': this.drawTunnel(); break;
            case 'fractal': this.drawFractal(); break;
            case 'bars': this.drawBars(); break;
            case 'matrix': this.drawMatrix(); break;
            case 'logo': this.drawTeamLogo(); break;
        }
        
        // Always show watermark
        this.drawWatermark();
    }
    
    drawWatermark() {
        const theme = this.themes[this.currentTheme];
        this.ctx.save();
        this.ctx.font = '12px "Press Start 2P", monospace';
        this.ctx.fillStyle = theme.primary + '40';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('MAX 100%', this.canvas2D.width - 15, this.canvas2D.height - 15);
        this.ctx.restore();
    }
    
    drawTeamLogo() {
        const theme = this.themes[this.currentTheme];
        const centerX = this.canvas2D.width / 2;
        const centerY = this.canvas2D.height / 2;
        const bass = this.visualData.bass;
        const treble = this.visualData.treble;
        
        // Background glow
        const bgGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300 + bass * 100);
        bgGradient.addColorStop(0, theme.primary + '30');
        bgGradient.addColorStop(0.5, theme.secondary + '15');
        bgGradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.canvas2D.width, this.canvas2D.height);
        
        // Rotating particles around text
        for (let i = 0; i < 100; i++) {
            const freq = this.visualData.frequency[i * 2] / 255;
            const angle = (i / 100) * Math.PI * 2 + this.time * 0.02 * this.settings.speed;
            const radius = 200 + freq * 150 + Math.sin(this.time * 0.05 + i) * 50;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius * 0.6;
            const size = 2 + freq * 6;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = i % 3 === 0 ? theme.primary : i % 3 === 1 ? theme.secondary : theme.tertiary;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = theme.primary;
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
        
        // Team name with audio reactive scale
        const scale = 1 + bass * 0.15;
        this.ctx.save();
        this.ctx.translate(centerX, centerY - 30);
        this.ctx.scale(scale, scale);
        
        // Glow effect
        this.ctx.shadowBlur = 30 + treble * 50;
        this.ctx.shadowColor = theme.primary;
        
        // "MAX" text
        this.ctx.font = `bold ${60 + bass * 20}px "Audiowide", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Gradient fill
        const textGradient = this.ctx.createLinearGradient(-100, -30, 100, 30);
        textGradient.addColorStop(0, theme.primary);
        textGradient.addColorStop(0.5, theme.secondary);
        textGradient.addColorStop(1, theme.tertiary);
        this.ctx.fillStyle = textGradient;
        this.ctx.fillText('MAX', 0, -20);
        
        // "100%" text
        this.ctx.font = `bold ${80 + bass * 30}px "Press Start 2P", monospace`;
        this.ctx.fillText('100%', 0, 60);
        
        this.ctx.restore();
        
        // Subtitle
        this.ctx.font = '16px "Orbitron", sans-serif';
        this.ctx.fillStyle = theme.secondary;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('NUIT DE L\'INFO 2024', centerX, centerY + 130);
        this.ctx.fillText('DÉFI CAPGEMINI', centerX, centerY + 155);
        
        // Audio bars at bottom
        const barCount = 64;
        const barWidth = this.canvas2D.width / barCount;
        for (let i = 0; i < barCount; i++) {
            const freq = this.visualData.frequency[i * 4] / 255;
            const barHeight = freq * 80 * this.settings.sensitivity;
            
            const gradient = this.ctx.createLinearGradient(0, this.canvas2D.height, 0, this.canvas2D.height - barHeight);
            gradient.addColorStop(0, theme.primary);
            gradient.addColorStop(1, theme.secondary);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                i * barWidth + 1,
                this.canvas2D.height - barHeight,
                barWidth - 2,
                barHeight
            );
        }
    }
    
    // =====================================================
    // VISUALIZATION MODES
    // =====================================================
    
    drawNebula() {
        const theme = this.themes[this.currentTheme];
        const centerX = this.canvas2D.width / 2;
        const centerY = this.canvas2D.height / 2;
        const bass = this.visualData.bass;
        const treble = this.visualData.treble;
        
        // Draw nebula clouds
        for (let i = 0; i < 5; i++) {
            const angle = (this.time * 0.01 + i * Math.PI * 0.4) * this.settings.speed;
            const radius = 100 + bass * 150 + i * 30;
            const x = centerX + Math.cos(angle) * radius * 0.5;
            const y = centerY + Math.sin(angle) * radius * 0.3;
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 150 + treble * 100);
            gradient.addColorStop(0, theme.primary + '80');
            gradient.addColorStop(0.5, theme.secondary + '40');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 150 + treble * 100, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Stars
        for (let i = 0; i < 64; i++) {
            const freq = this.visualData.frequency[i * 4] / 255;
            const angle = (i / 64) * Math.PI * 2 + this.time * 0.005;
            const dist = 50 + freq * 200 * this.settings.sensitivity;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;
            const size = 2 + freq * 5;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = freq > 0.5 ? theme.tertiary : theme.secondary;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = theme.primary;
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
    }
    
    drawDNA() {
        const theme = this.themes[this.currentTheme];
        const centerY = this.canvas2D.height / 2;
        const segments = 50;
        
        for (let i = 0; i < segments; i++) {
            const x = (i / segments) * this.canvas2D.width;
            const freq = this.visualData.frequency[i * 5] / 255;
            const phase = this.time * 0.05 * this.settings.speed + i * 0.3;
            
            const y1 = centerY + Math.sin(phase) * (80 + freq * 100 * this.settings.sensitivity);
            const y2 = centerY + Math.sin(phase + Math.PI) * (80 + freq * 100 * this.settings.sensitivity);
            
            // Helix strands
            this.ctx.beginPath();
            this.ctx.arc(x, y1, 8 + freq * 10, 0, Math.PI * 2);
            this.ctx.fillStyle = theme.primary;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = theme.primary;
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(x, y2, 8 + freq * 10, 0, Math.PI * 2);
            this.ctx.fillStyle = theme.secondary;
            this.ctx.shadowColor = theme.secondary;
            this.ctx.fill();
            
            // Connecting bars
            if (i % 3 === 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y1);
                this.ctx.lineTo(x, y2);
                this.ctx.strokeStyle = theme.tertiary + '80';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
        }
        this.ctx.shadowBlur = 0;
    }
    
    drawBlackHole() {
        const theme = this.themes[this.currentTheme];
        const centerX = this.canvas2D.width / 2;
        const centerY = this.canvas2D.height / 2;
        const bass = this.visualData.bass;
        
        // Accretion disk
        for (let ring = 0; ring < 20; ring++) {
            const radius = 50 + ring * 15 + bass * 30;
            const particles = 60 + ring * 5;
            
            for (let i = 0; i < particles; i++) {
                const freq = this.visualData.frequency[(i + ring * 10) % 256] / 255;
                const angle = (i / particles) * Math.PI * 2 + this.time * 0.02 * (1 + ring * 0.1) * this.settings.speed;
                const wobble = Math.sin(angle * 3 + this.time * 0.1) * 10 * freq;
                
                const x = centerX + Math.cos(angle) * (radius + wobble);
                const y = centerY + Math.sin(angle) * (radius + wobble) * 0.3; // Perspective
                const size = 2 + freq * 4;
                
                const hue = (ring * 20 + this.time) % 360;
                this.ctx.fillStyle = ring < 5 ? theme.tertiary : ring < 10 ? theme.secondary : theme.primary;
                this.ctx.globalAlpha = 0.3 + freq * 0.7;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Event horizon
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.7, '#000000');
        gradient.addColorStop(1, theme.primary + '50');
        
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 50 + bass * 20, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawTerrain() {
        const theme = this.themes[this.currentTheme];
        const rows = 30;
        const cols = 50;
        const cellWidth = this.canvas2D.width / cols;
        const cellHeight = this.canvas2D.height / rows;
        
        this.ctx.strokeStyle = theme.primary;
        this.ctx.lineWidth = 1;
        
        for (let y = 0; y < rows; y++) {
            this.ctx.beginPath();
            for (let x = 0; x <= cols; x++) {
                const freqIndex = (x + y + Math.floor(this.time * 0.1 * this.settings.speed)) % 256;
                const freq = this.visualData.frequency[freqIndex] / 255;
                
                const px = x * cellWidth;
                const baseY = y * cellHeight;
                const height = freq * 100 * this.settings.sensitivity;
                const py = baseY - height + this.canvas2D.height * 0.3;
                
                if (x === 0) {
                    this.ctx.moveTo(px, py);
                } else {
                    this.ctx.lineTo(px, py);
                }
            }
            
            const alpha = 0.3 + (y / rows) * 0.7;
            this.ctx.strokeStyle = `rgba(${this.hexToRgb(theme.primary).r}, ${this.hexToRgb(theme.primary).g}, ${this.hexToRgb(theme.primary).b}, ${alpha})`;
            this.ctx.stroke();
        }
        
        // Sun/Moon
        const gradient = this.ctx.createRadialGradient(
            this.canvas2D.width * 0.8, 80, 0,
            this.canvas2D.width * 0.8, 80, 60 + this.visualData.bass * 30
        );
        gradient.addColorStop(0, theme.tertiary);
        gradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.canvas2D.width * 0.8, 80, 60 + this.visualData.bass * 30, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawGalaxy() {
        const theme = this.themes[this.currentTheme];
        const centerX = this.canvas2D.width / 2;
        const centerY = this.canvas2D.height / 2;
        
        const arms = 4;
        const starsPerArm = 150;
        
        for (let arm = 0; arm < arms; arm++) {
            const armAngle = (arm / arms) * Math.PI * 2;
            
            for (let i = 0; i < starsPerArm; i++) {
                const freq = this.visualData.frequency[(arm * starsPerArm + i) % 256] / 255;
                const dist = (i / starsPerArm) * 200 + freq * 50;
                const spiralAngle = armAngle + (i / starsPerArm) * Math.PI * 2 + this.time * 0.01 * this.settings.speed;
                const scatter = (Math.random() - 0.5) * 30;
                
                const x = centerX + Math.cos(spiralAngle) * dist + scatter;
                const y = centerY + Math.sin(spiralAngle) * dist * 0.5 + scatter * 0.5;
                const size = 1 + freq * 4;
                
                this.ctx.fillStyle = i < starsPerArm * 0.3 ? theme.tertiary : 
                                    i < starsPerArm * 0.6 ? theme.secondary : theme.primary;
                this.ctx.globalAlpha = 0.5 + freq * 0.5;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Core glow
        const coreGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
        coreGradient.addColorStop(0, theme.tertiary);
        coreGradient.addColorStop(0.5, theme.primary + '50');
        coreGradient.addColorStop(1, 'transparent');
        
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 50 + this.visualData.bass * 30, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawHypercube() {
        const theme = this.themes[this.currentTheme];
        const centerX = this.canvas2D.width / 2;
        const centerY = this.canvas2D.height / 2;
        const size = 100 + this.visualData.bass * 50;
        
        // 4D to 3D to 2D projection
        const w = this.time * 0.02 * this.settings.speed;
        
        // Tesseract vertices
        const vertices = [];
        for (let i = 0; i < 16; i++) {
            const x = (i & 1) ? 1 : -1;
            const y = (i & 2) ? 1 : -1;
            const z = (i & 4) ? 1 : -1;
            const w4 = (i & 8) ? 1 : -1;
            
            // Rotate in 4D
            const cos_w = Math.cos(w);
            const sin_w = Math.sin(w);
            const xw = x * cos_w - w4 * sin_w;
            const ww = x * sin_w + w4 * cos_w;
            
            // Project to 3D
            const scale3D = 2 / (3 - ww);
            const x3 = xw * scale3D;
            const y3 = y * scale3D;
            const z3 = z * scale3D;
            
            // Rotate in 3D
            const cos_t = Math.cos(this.time * 0.01);
            const sin_t = Math.sin(this.time * 0.01);
            const xr = x3 * cos_t - z3 * sin_t;
            const zr = x3 * sin_t + z3 * cos_t;
            
            // Project to 2D
            const scale2D = 200 / (3 - zr);
            vertices.push({
                x: centerX + xr * scale2D * (size / 100),
                y: centerY + y3 * scale2D * (size / 100),
                z: zr
            });
        }
        
        // Draw edges
        const edges = [
            [0,1],[0,2],[0,4],[0,8],
            [1,3],[1,5],[1,9],
            [2,3],[2,6],[2,10],
            [3,7],[3,11],
            [4,5],[4,6],[4,12],
            [5,7],[5,13],
            [6,7],[6,14],
            [7,15],
            [8,9],[8,10],[8,12],
            [9,11],[9,13],
            [10,11],[10,14],
            [11,15],
            [12,13],[12,14],
            [13,15],
            [14,15]
        ];
        
        this.ctx.lineWidth = 2;
        edges.forEach((edge, i) => {
            const freq = this.visualData.frequency[i * 8] / 255;
            const v1 = vertices[edge[0]];
            const v2 = vertices[edge[1]];
            
            const gradient = this.ctx.createLinearGradient(v1.x, v1.y, v2.x, v2.y);
            gradient.addColorStop(0, theme.primary);
            gradient.addColorStop(1, theme.secondary);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.globalAlpha = 0.5 + freq * 0.5;
            this.ctx.shadowBlur = 10 + freq * 20;
            this.ctx.shadowColor = theme.primary;
            
            this.ctx.beginPath();
            this.ctx.moveTo(v1.x, v1.y);
            this.ctx.lineTo(v2.x, v2.y);
            this.ctx.stroke();
        });
        
        // Draw vertices
        vertices.forEach((v, i) => {
            const freq = this.visualData.frequency[i * 16] / 255;
            this.ctx.fillStyle = theme.tertiary;
            this.ctx.beginPath();
            this.ctx.arc(v.x, v.y, 5 + freq * 10, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }
    
    drawFire() {
        const theme = this.themes[this.currentTheme];
        const particles = 100;
        
        for (let i = 0; i < particles; i++) {
            const freq = this.visualData.frequency[i * 2] / 255;
            const x = (i / particles) * this.canvas2D.width;
            const baseY = this.canvas2D.height;
            
            // Multiple flame layers
            for (let layer = 0; layer < 3; layer++) {
                const layerOffset = layer * 0.3;
                const height = (50 + freq * 200 * this.settings.sensitivity) * (1 - layerOffset);
                const wobble = Math.sin(this.time * 0.1 + i * 0.5 + layer) * 20 * freq;
                
                const y = baseY - height;
                const gradient = this.ctx.createLinearGradient(x, baseY, x, y);
                
                if (layer === 0) {
                    gradient.addColorStop(0, theme.tertiary);
                    gradient.addColorStop(0.3, theme.secondary);
                    gradient.addColorStop(1, 'transparent');
                } else if (layer === 1) {
                    gradient.addColorStop(0, theme.secondary + '80');
                    gradient.addColorStop(1, 'transparent');
                } else {
                    gradient.addColorStop(0, theme.primary + '60');
                    gradient.addColorStop(1, 'transparent');
                }
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.moveTo(x - 10 + wobble, baseY);
                this.ctx.quadraticCurveTo(x + wobble, y, x + 10 + wobble, baseY);
                this.ctx.fill();
            }
        }
        
        // Sparks
        for (let i = 0; i < 20; i++) {
            const freq = this.visualData.frequency[i * 12] / 255;
            if (freq > 0.5) {
                const x = Math.random() * this.canvas2D.width;
                const y = this.canvas2D.height - 100 - Math.random() * 200 * freq;
                
                this.ctx.fillStyle = theme.tertiary;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = theme.tertiary;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2 + freq * 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.shadowBlur = 0;
    }
    
    drawWave3D() {
        const theme = this.themes[this.currentTheme];
        const rows = 25;
        const cols = 60;
        const cellWidth = this.canvas2D.width / cols;
        
        for (let z = rows - 1; z >= 0; z--) {
            const perspective = 1 - (z / rows) * 0.7;
            const yOffset = z * 15;
            
            this.ctx.beginPath();
            
            for (let x = 0; x <= cols; x++) {
                const freqIndex = (x + z * 2 + Math.floor(this.time * 0.2 * this.settings.speed)) % 256;
                const freq = this.visualData.frequency[freqIndex] / 255;
                
                const px = x * cellWidth * perspective + this.canvas2D.width * (1 - perspective) / 2;
                const wave = Math.sin(x * 0.2 + this.time * 0.05 * this.settings.speed + z * 0.5) * 30;
                const height = freq * 80 * this.settings.sensitivity;
                const py = this.canvas2D.height * 0.6 + yOffset - height + wave;
                
                if (x === 0) {
                    this.ctx.moveTo(px, py);
                } else {
                    this.ctx.lineTo(px, py);
                }
            }
            
            const alpha = (1 - z / rows);
            const rgb = this.hexToRgb(z < rows / 2 ? theme.primary : theme.secondary);
            this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }
    
    drawTunnel() {
        const theme = this.themes[this.currentTheme];
        const centerX = this.canvas2D.width / 2;
        const centerY = this.canvas2D.height / 2;
        const rings = 20;
        
        for (let i = rings - 1; i >= 0; i--) {
            const progress = (i + (this.time * 0.05 * this.settings.speed) % 1) / rings;
            const radius = 20 + progress * 400;
            const freq = this.visualData.frequency[i * 12] / 255;
            
            // Distort ring
            const segments = 60;
            this.ctx.beginPath();
            
            for (let j = 0; j <= segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                const distortion = freq * 20 * Math.sin(angle * 6 + this.time * 0.1);
                const r = radius + distortion;
                
                const x = centerX + Math.cos(angle) * r;
                const y = centerY + Math.sin(angle) * r;
                
                if (j === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.closePath();
            const alpha = 1 - progress;
            this.ctx.strokeStyle = `rgba(${this.hexToRgb(progress < 0.5 ? theme.primary : theme.secondary).r}, ${this.hexToRgb(progress < 0.5 ? theme.primary : theme.secondary).g}, ${this.hexToRgb(progress < 0.5 ? theme.primary : theme.secondary).b}, ${alpha})`;
            this.ctx.lineWidth = 2 + freq * 3;
            this.ctx.stroke();
        }
        
        // Center glow
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
        gradient.addColorStop(0, theme.tertiary);
        gradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 30 + this.visualData.bass * 20, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawFractal() {
        const theme = this.themes[this.currentTheme];
        const centerX = this.canvas2D.width / 2;
        const centerY = this.canvas2D.height / 2;
        
        const drawBranch = (x, y, length, angle, depth) => {
            if (depth === 0 || length < 5) return;
            
            const freq = this.visualData.frequency[depth * 30] / 255;
            const endX = x + Math.cos(angle) * length;
            const endY = y + Math.sin(angle) * length;
            
            const colors = [theme.primary, theme.secondary, theme.tertiary];
            this.ctx.strokeStyle = colors[depth % 3];
            this.ctx.lineWidth = depth * 0.5;
            this.ctx.globalAlpha = 0.5 + freq * 0.5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            
            const angleOffset = 0.5 + freq * 0.3;
            const lengthRatio = 0.7 + freq * 0.1;
            
            drawBranch(endX, endY, length * lengthRatio, angle - angleOffset, depth - 1);
            drawBranch(endX, endY, length * lengthRatio, angle + angleOffset, depth - 1);
        };
        
        const baseLength = 100 + this.visualData.bass * 50;
        const rotation = this.time * 0.01 * this.settings.speed;
        
        // Draw from center in multiple directions
        for (let i = 0; i < 6; i++) {
            const baseAngle = (i / 6) * Math.PI * 2 + rotation;
            drawBranch(centerX, centerY, baseLength, baseAngle - Math.PI / 2, 8);
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    drawBars() {
        const theme = this.themes[this.currentTheme];
        const barCount = 64;
        const barWidth = this.canvas2D.width / barCount;
        const maxHeight = this.canvas2D.height * 0.8;
        
        for (let i = 0; i < barCount; i++) {
            const freq = this.visualData.frequency[i * 4] / 255;
            const barHeight = freq * maxHeight * this.settings.sensitivity;
            const x = i * barWidth;
            const y = this.canvas2D.height - barHeight;
            
            // Gradient bar
            const gradient = this.ctx.createLinearGradient(x, y, x, this.canvas2D.height);
            gradient.addColorStop(0, theme.primary);
            gradient.addColorStop(0.5, theme.secondary);
            gradient.addColorStop(1, theme.tertiary);
            
            this.ctx.fillStyle = gradient;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = theme.primary;
            this.ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
            
            // Peak dot
            if (freq > 0.7) {
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(x + barWidth / 2, y - 10, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Mirror reflection
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x + 1, this.canvas2D.height, barWidth - 2, barHeight * 0.3);
            this.ctx.globalAlpha = 1;
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    drawMatrix() {
        const theme = this.themes[this.currentTheme];
        const columns = Math.floor(this.canvas2D.width / 20);
        
        if (!this.matrixDrops) {
            this.matrixDrops = [];
            for (let i = 0; i < columns; i++) {
                this.matrixDrops.push({
                    y: Math.random() * -100,
                    speed: 2 + Math.random() * 5,
                    chars: []
                });
                for (let j = 0; j < 20; j++) {
                    this.matrixDrops[i].chars.push(String.fromCharCode(0x30A0 + Math.random() * 96));
                }
            }
        }
        
        this.ctx.font = '16px monospace';
        
        this.matrixDrops.forEach((drop, i) => {
            const freq = this.visualData.frequency[i * 4] / 255;
            drop.y += drop.speed * (0.5 + freq * this.settings.speed);
            
            if (drop.y > this.canvas2D.height + 400) {
                drop.y = -400;
                for (let j = 0; j < drop.chars.length; j++) {
                    drop.chars[j] = String.fromCharCode(0x30A0 + Math.random() * 96);
                }
            }
            
            const x = i * 20;
            drop.chars.forEach((char, j) => {
                const y = drop.y - j * 20;
                if (y > 0 && y < this.canvas2D.height) {
                    const alpha = (1 - j / drop.chars.length) * (0.5 + freq * 0.5);
                    this.ctx.fillStyle = `rgba(${this.hexToRgb(theme.primary).r}, ${this.hexToRgb(theme.primary).g}, ${this.hexToRgb(theme.primary).b}, ${alpha})`;
                    this.ctx.fillText(char, x, y);
                }
            });
            
            // Bright head
            const headY = drop.y;
            if (headY > 0 && headY < this.canvas2D.height) {
                this.ctx.fillStyle = '#fff';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = theme.primary;
                this.ctx.fillText(drop.chars[0], x, headY);
                this.ctx.shadowBlur = 0;
            }
        });
    }
    
    // =====================================================
    // WAVEFORM & SPECTRUM
    // =====================================================
    
    drawWaveform() {
        const theme = this.themes[this.currentTheme];
        const ctx = this.waveCtx;
        const width = this.waveformCanvas.width;
        const height = this.waveformCanvas.height;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.secondary;
        ctx.shadowBlur = 10;
        ctx.shadowColor = theme.secondary;
        
        ctx.beginPath();
        const sliceWidth = width / this.visualData.waveform.length;
        let x = 0;
        
        for (let i = 0; i < this.visualData.waveform.length; i++) {
            const v = this.visualData.waveform[i] / 128.0;
            const y = (v * height / 2);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    drawMiniSpectrum() {
        const theme = this.themes[this.currentTheme];
        const ctx = this.specCtx;
        const width = this.spectrumCanvas.width;
        const height = this.spectrumCanvas.height;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
        
        const barCount = 32;
        const barWidth = width / barCount;
        
        for (let i = 0; i < barCount; i++) {
            const freq = this.visualData.frequency[i * 8] / 255;
            const barHeight = freq * height * this.settings.sensitivity;
            
            const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, theme.primary);
            gradient.addColorStop(1, theme.secondary);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight);
        }
    }
    
    applyMirror() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas2D.width / 2, this.canvas2D.height);
        this.ctx.save();
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.canvas2D, -this.canvas2D.width, 0);
        this.ctx.restore();
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new SonicDimension();
});

// Add rainbow keyframes for Easter egg
const style = document.createElement('style');
style.textContent = `
    @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
    }
    
    .mini-bar::after {
        width: var(--level, 0%);
    }
`;
document.head.appendChild(style);
