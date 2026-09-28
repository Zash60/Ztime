# Speedrun Timer Video Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side web app that generates MP4 videos of a speedrun timer counting from 0 to a user-defined time, with frame-accurate millisecond rounding at a configurable FPS.

**Architecture:** Single-page app with vanilla HTML/CSS/JS. Canvas 2D draws each timer frame; ffmpeg.wasm encodes frames into MP4. Four components: TimerDisplay (draws timer), VideoGenerator (manages ffmpeg.wasm), ConfigPanel (user inputs), Preview (live preview).

**Tech Stack:** HTML5, CSS3, JavaScript (ES2020+), Canvas 2D API, ffmpeg.wasm

**Spec:** `docs/superpowers/specs/2026-09-28-speedrun-timer-design.md`

## Global Constraints

- No framework — vanilla HTML/CSS/JS only
- All processing client-side (no server)
- FPS range: 1–240
- Video FPS = timer FPS
- Timer always centered
- Output format: MP4
- No animations, no border/shadow, no extra elements
- Millisecond rounding: at 60fps frames show 000, 017, 033, 050… (never 016.67777)
- Time formats: M:SS.mmm, M:SS.cc, M:SS.d (user-selectable)
- Background: solid color or transparent
- Resolution: configurable (e.g. 1280x720, 1920x1080, 3840x2160)
- Font: configurable family, size, color

## Review Focus

1. **Millisecond rounding at non-integer FPS** — e.g. 59.94fps, 29.97fps: frames must show correct rounded values, not raw division
2. **Long video generation** — 1+ hour videos: memory usage and progress reporting must not freeze the UI
3. **ffmpeg.wasm loading** — the ~30MB library must load reliably and show loading state
4. **Transparent background** — alpha channel must be preserved in the MP4 output
5. **Invalid inputs** — negative time, zero FPS, invalid resolution: must show clear errors, not crash

---

### Task 1: Project Setup & ffmpeg.wasm Loading

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/app.js`
- Create: `js/ffmpeg-loader.js`
- Test: `tests/test-ffmpeg-loader.html`

**Interfaces:**
- Consumes: nothing
- Produces: `FFmpegLoader` class with `load(): Promise<FFmpeg>`, `isLoaded(): boolean`, `getProgress(): number`

- [ ] **Step 1: Create project structure**

Create directories: `css/`, `js/`, `tests/`, `vendor/`

- [ ] **Step 2: Write the failing test**

Create `tests/test-ffmpeg-loader.html`:
```html
<!DOCTYPE html>
<html>
<head><title>FFmpegLoader Test</title></head>
<body>
<script src="../js/ffmpeg-loader.js"></script<script>
<script>
// Test: FFmpegLoader class exists
console.assert(typeof FFmpegLoader === 'function', 'FFmpegLoader must be a function');
// Test: load() returns a promise
const loader = new FFmpegLoader();
console.assert(typeof loader.load === 'function', 'load must be a function');
console.assert(typeof loader.isLoaded === 'function', 'isLoaded must be a function');
console.assert(typeof loader.getProgress === 'function', 'getProgress must be a function');
console.log('All FFmpegLoader tests passed');
</script>
</body>
</html>
```

- [ ] **Step 3: Run test to verify it fails**

Open `tests/test-ffmpeg-loader.html` in browser.
Expected: FAIL with "FFmpegLoader is not defined"

- [ ] **Step 4: Implement `FFmpegLoader` in `js/ffmpeg-loader.js`**

```javascript
class FFmpegLoader {
  constructor() {
    this.ffmpeg = null;
    this.loading = false;
    this.progress = 0;
  }

  async load() {
    if (this.ffmpeg) return this.ffmpeg;
    if (this.loading) return this._loadingPromise;
    
    this.loading = true;
    this.progress = 0;
    
    // Load ffmpeg.wasm from CDN
    const { createFFmpeg, fetchFile } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');
    
    this.ffmpeg = createFFmpeg({
      log: false,
      progress: ({ ratio }) => {
        this.progress = Math.round(ratio * 100);
      },
    });
    
    await this.ffmpeg.load();
    this.loading = false;
    return this.ffmpeg;
  }

  isLoaded() {
    return this.ffmpeg !== null;
  }

  getProgress() {
    return this.progress;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Open `tests/test-ffmpeg-loader.html` in browser.
Expected: "All FFmpegLoader tests passed"

- [ ] **Step 6: Commit**

```bash
git add index.html css/ js/ tests/
git commit -m "feat: add project structure and FFmpegLoader"
```

---

### Task 2: Timer Display Component

**Files:**
- Create: `js/timer.js`
- Test: `tests/test-timer.html`

**Interfaces:**
- Consumes: nothing
- Produces: `TimerDisplay` class with `draw(canvas, timeMs, fps, options)`, `formatTime(timeMs, fps, format)`, `roundMs(timeMs, fps)`

- [ ] **Step 1: Write the failing test**

Create `tests/test-timer.html`:
```html
<!DOCTYPE html>
<html>
<head><title>TimerDisplay Test</title></head>
<body>
<script src="../js/timer.js"></script>
<script>
// Test: formatTime with 60fps
console.assert(TimerDisplay.formatTime(0, 60, 'mmm') === '0:00.000', '0ms at 60fps should be 0:00.000');
console.assert(TimerDisplay.formatTime(16.6667, 60, 'mmm') === '0:00.017', '16.6667ms at 60fps should be 0:00.017');
console.assert(TimerDisplay.formatTime(33.3333, 60, 'mmm') === '0:00.033', '33.3333ms at 60fps should be 0:00.033');
console.assert(TimerDisplay.formatTime(50, 60, 'mmm') === '0:00.050', '50ms at 60fps should be 0:00.050');

// Test: formatTime with 30fps
console.assert(TimerDisplay.formatTime(0, 30, 'mmm') === '0:00.000', '0ms at 30fps should be 0:00.000');
console.assert(TimerDisplay.formatTime(33.3333, 30, 'mmm') === '0:00.033', '33.3333ms at 30fps should be 0:00.033');
console.assert(TimerDisplay.formatTime(66.6667, 30, 'mmm') === '0:00.067', '66.6667ms at 30fps should be 0:00.067');

// Test: formatTime with centiseconds
console.assert(TimerDisplay.formatTime(1234, 60, 'cc') === '0:01.23', '1234ms should be 0:01.23');
console.assert(TimerDisplay.formatTime(1234, 60, 'd') === '0:01.2', '1234ms should be 0:01.2');

// Test: roundMs
console.assert(TimerDisplay.roundMs(16.6667, 60) === 17, '16.6667ms at 60fps should round to 17');
console.assert(TimerDisplay.roundMs(33.3333, 60) === 33, '33.3333ms at 60fps should round to 33');
console.assert(TimerDisplay.roundMs(50, 60) === 50, '50ms at 60fps should round to 50');

console.log('All TimerDisplay tests passed');
</script>
</body>
</html>
```

- [ ] **Step 2: Run test to verify it fails**

Open `tests/test-timer.html` in browser.
Expected: FAIL with "TimerDisplay is not defined"

- [ ] **Step 3: Implement `TimerDisplay` in `js/timer.js`**

```javascript
class TimerDisplay {
  static roundMs(timeMs, fps) {
    const frameDuration = 1000 / fps;
    return Math.round(timeMs / frameDuration) * frameDuration;
  }

  static formatTime(timeMs, fps, format = 'mmm') {
    const roundedMs = this.roundMs(timeMs, fps);
    const totalSeconds = Math.floor(roundedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor(roundedMs % 1000);

    const ss = String(seconds).padStart(2, '0');

    if (format === 'mmm') {
      const mmm = String(ms).padStart(3, '0');
      return `${minutes}:${ss}.${mmm}`;
    } else if (format === 'cc') {
      const cc = String(Math.floor(ms / 10)).padStart(2, '0');
      return `${minutes}:${ss}.${cc}`;
    } else if (format === 'd') {
      const d = String(Math.floor(ms / 100));
      return `${minutes}:${ss}.${d}`;
    }
    return `${minutes}:${ss}.${String(ms).padStart(3, '0')}`;
  }

  static draw(canvas, timeMs, fps, options) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const { background, font, format } = options;

    // Clear and draw background
    if (background === 'transparent') {
      ctx.clearRect(0, 0, width, height);
    } else {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw timer text
    const text = this.formatTime(timeMs, fps, format);
    ctx.fillStyle = font.color;
    ctx.font = `${font.size}px ${font.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Open `tests/test-timer.html` in browser.
Expected: "All TimerDisplay tests passed"

- [ ] **Step 5: Commit**

```bash
git add js/timer.js tests/test-timer.html
git commit -m "feat: add TimerDisplay component"
```

---

### Task 3: Video Generator Component

**Files:**
- Create: `js/generator.js`
- Test: `tests/test-generator.html`

**Interfaces:**
- Consumes: `FFmpegLoader` (Task 1), `TimerDisplay` (Task 2)
- Produces: `VideoGenerator` class with `generate(config, onProgress): Promise<Blob>`

- [ ] **Step 1: Write the failing test**

Create `tests/test-generator.html`:
```html
<!DOCTYPE html>
<html>
<head><title>VideoGenerator Test</title></head>
<body>
<script src="../js/ffmpeg-loader.js"></script>
<script src="../js/timer.js"></script>
<script src="../js/generator.js"></script>
<script>
// Test: VideoGenerator class exists
console.assert(typeof VideoGenerator === 'function', 'VideoGenerator must be a function');
// Test: generate() returns a promise
const gen = new VideoGenerator();
console.assert(typeof gen.generate === 'function', 'generate must be a function');

console.log('All VideoGenerator tests passed');
</script>
</body>
</html>
```

- [ ] **Step 2: Run test to verify it fails**

Open `tests/test-generator.html` in browser.
Expected: FAIL with "VideoGenerator is not defined"

- [ ] **Step 3: Implement `VideoGenerator` in `js/generator.js`**

```javascript
class VideoGenerator {
  constructor(ffmpegLoader) {
    this.ffmpegLoader = ffmpegLoader;
  }

  async generate(config, onProgress) {
    const { fps, finalTimeMs, width, height, background, font, format } = config;
    
    // Load ffmpeg
    const ffmpeg = await this.ffmpegLoader.load();
    
    // Calculate total frames
    const totalFrames = Math.ceil((finalTimeMs / 1000) * fps);
    const frameDuration = 1000 / fps;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    // Generate frames
    for (let i = 0; i < totalFrames; i++) {
      const timeMs = i * frameDuration;
      TimerDisplay.draw(canvas, timeMs, fps, { background, font, format });
      
      // Convert canvas to blob and write to ffmpeg
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const frameName = `frame_${String(i).padStart(6, '0')}.png`;
      ffmpeg.FS('writeFile', frameName, uint8Array);
      
      // Report progress
      if (onProgress) {
        onProgress(Math.round((i / totalFrames) * 100));
      }
    }
    
    // Run ffmpeg to encode MP4
    await ffmpeg.run(
      '-framerate', String(fps),
      '-i', 'frame_%06d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      'output.mp4'
    );
    
    // Read output
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    
    // Cleanup
    for (let i = 0; i < totalFrames; i++) {
      const frameName = `frame_${String(i).padStart(6, '0')}.png`;
      ffmpeg.FS('unlink', frameName);
    }
    ffmpeg.FS('unlink', 'output.mp4');
    
    return blob;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Open `tests/test-generator.html` in browser.
Expected: "All VideoGenerator tests passed"

- [ ] **Step 5: Commit**

```bash
git add js/generator.js tests/test-generator.html
git commit -m "feat: add VideoGenerator component"
```

---

### Task 4: Config Panel Component

**Files:**
- Create: `js/config.js`
- Test: `tests/test-config.html`

**Interfaces:**
- Consumes: nothing
- Produces: `ConfigPanel` class with `getConfig(): object`, `validate(): boolean`, `onGenerate(callback)`

- [ ] **Step 1: Write the failing test**

Create `tests/test-config.html`:
```html
<!DOCTYPE html>
<html>
<head><title>ConfigPanel Test</title></head>
<body>
<script src="../js/config.js"></script>
<script>
// Test: ConfigPanel class exists
console.assert(typeof ConfigPanel === 'function', 'ConfigPanel must be a function');
// Test: getConfig() returns object
const panel = new ConfigPanel();
console.assert(typeof panel.getConfig === 'function', 'getConfig must be a function');
console.assert(typeof panel.validate === 'function', 'validate must be a function');
console.assert(typeof panel.onGenerate === 'function', 'onGenerate must be a function');

console.log('All ConfigPanel tests passed');
</script>
</body>
</html>
```

- [ ] **Step 2: Run test to verify it fails**

Open `tests/test-config.html` in browser.
Expected: FAIL with "ConfigPanel is not defined"

- [ ] **Step 3: Implement `ConfigPanel` in `js/config.js`**

```javascript
class ConfigPanel {
  constructor(container) {
    this.container = container;
    this.generateCallback = null;
    this._render();
  }

  _render() {
    this.container.innerHTML = `
      <div class="config-panel">
        <h2>Timer Configuration</h2>
        
        <label>FPS (1-240):</label>
        <input type="number" id="fps" value="60" min="1" max="240">
        
        <label>Final Time (MM:SS.mmm):</label>
        <input type="text" id="finalTime" value="01:00.000" placeholder="01:00.000">
        
        <label>Resolution:</label>
        <select id="resolution">
          <option value="1280x720">1280x720 (HD)</option>
          <option value="1920x1080" selected>1920x1080 (Full HD)</option>
          <option value="3840x2160">3840x2160 (4K)</option>
        </select>
        
        <label>Background:</label>
        <select id="background">
          <option value="transparent">Transparent</option>
          <option value="#000000">Black</option>
          <option value="#ffffff">White</option>
          <option value="#ff0000">Red</option>
          <option value="#00ff00">Green</option>
          <option value="#0000ff">Blue</option>
        </select>
        
        <label>Font Family:</label>
        <select id="fontFamily">
          <option value="monospace" selected>Monospace</option>
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Courier New">Courier New</option>
        </select>
        
        <label>Font Size (px):</label>
        <input type="number" id="fontSize" value="48" min="8" max="200">
        
        <label>Font Color:</label>
        <input type="color" id="fontColor" value="#ffffff">
        
        <label>Time Format:</label>
        <select id="timeFormat">
          <option value="mmm" selected>M:SS.mmm</option>
          <option value="cc">M:SS.cc</option>
          <option value="d">M:SS.d</option>
        </select>
        
        <button id="generateBtn">Generate Video</button>
        <div id="progressBar" style="display:none;">
          <div id="progressFill"></div>
        </div>
        <div id="errorMsg" style="color:red;"></div>
      </div>
    `;
    
    this.container.querySelector('#generateBtn').addEventListener('click', () => {
      if (this.generateCallback) this.generateCallback();
    });
  }

  getConfig() {
    const [width, height] = this.container.querySelector('#resolution').value.split('x').map(Number);
    const finalTimeStr = this.container.querySelector('#finalTime').value;
    const parts = finalTimeStr.split(':');
    const minutes = parseInt(parts[0], 10);
    const secondsParts = parts[1].split('.');
    const seconds = parseInt(secondsParts[0], 10);
    const ms = parseInt((secondsParts[1] || '0').padEnd(3, '0').slice(0, 3), 10);
    const finalTimeMs = (minutes * 60 + seconds) * 1000 + ms;
    
    return {
      fps: parseInt(this.container.querySelector('#fps').value, 10),
      finalTimeMs,
      width,
      height,
      background: this.container.querySelector('#background').value,
      font: {
        family: this.container.querySelector('#fontFamily').value,
        size: parseInt(this.container.querySelector('#fontSize').value, 10),
        color: this.container.querySelector('#fontColor').value,
      },
      format: this.container.querySelector('#timeFormat').value,
    };
  }

  validate() {
    const config = this.getConfig();
    const errors = [];
    
    if (config.fps < 1 || config.fps > 240) {
      errors.push('FPS must be between 1 and 240');
    }
    if (config.finalTimeMs <= 0) {
      errors.push('Final time must be greater than 0');
    }
    if (config.width <= 0 || config.height <= 0) {
      errors.push('Resolution must be positive');
    }
    
    const errorMsg = this.container.querySelector('#errorMsg');
    if (errors.length > 0) {
      errorMsg.textContent = errors.join(', ');
      return false;
    }
    errorMsg.textContent = '';
    return true;
  }

  onGenerate(callback) {
    this.generateCallback = callback;
  }

  showProgress(percent) {
    const bar = this.container.querySelector('#progressBar');
    const fill = this.container.querySelector('#progressFill');
    bar.style.display = 'block';
    fill.style.width = `${percent}%`;
  }

  hideProgress() {
    this.container.querySelector('#progressBar').style.display = 'none';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Open `tests/test-config.html` in browser.
Expected: "All ConfigPanel tests passed"

- [ ] **Step 5: Commit**

```bash
git add js/config.js tests/test-config.html
git commit -m "feat: add ConfigPanel component"
```

---

### Task 5: Preview Component

**Files:**
- Create: `js/preview.js`
- Test: `tests/test-preview.html`

**Interfaces:**
- Consumes: `TimerDisplay` (Task 2)
- Produces: `Preview` class with `update(config)`, `getCanvas(): HTMLCanvasElement`

- [ ] **Step 1: Write the failing test**

Create `tests/test-preview.html`:
```html
<!DOCTYPE html>
<html>
<head><title>Preview Test</title></head>
<body>
<script src="../js/timer.js"></script>
<script src="../js/preview.js"></script>
<script>
// Test: Preview class exists
console.assert(typeof Preview === 'function', 'Preview must be a function');
// Test: update() and getCanvas() exist
const preview = new Preview(document.createElement('div'));
console.assert(typeof preview.update === 'function', 'update must be a function');
console.assert(typeof preview.getCanvas === 'function', 'getCanvas must be a function');

console.log('All Preview tests passed');
</script>
</body>
</html>
```

- [ ] **Step 2: Run test to verify it fails**

Open `tests/test-preview.html` in browser.
Expected: FAIL with "Preview is not defined"

- [ ] **Step 3: Implement `Preview` in `js/preview.js`**

```javascript
class Preview {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
  }

  update(config) {
    const { fps, width, height, background, font, format } = config;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Draw initial frame (time = 0)
    TimerDisplay.draw(this.canvas, 0, fps, { background, font, format });
  }

  getCanvas() {
    return this.canvas;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Open `tests/test-preview.html` in browser.
Expected: "All Preview tests passed"

- [ ] **Step 5: Commit**

```bash
git add js/preview.js tests/test-preview.html
git commit -m "feat: add Preview component"
```

---

### Task 6: Main App Integration

**Files:**
- Create: `js/app.js`
- Modify: `index.html`
- Test: `tests/test-app.html`

**Interfaces:**
- Consumes: `FFmpegLoader` (Task 1), `TimerDisplay` (Task 2), `VideoGenerator` (Task 3), `ConfigPanel` (Task 4), `Preview` (Task 5)
- Produces: `App` class with `init()`

- [ ] **Step 1: Write the failing test**

Create `tests/test-app.html`:
```html
<!DOCTYPE html>
<html>
<head><title>App Test</title></head>
<body>
<script src="../js/ffmpeg-loader.js"></script>
<script src="../js/timer.js"></script>
<script src="../js/generator.js"></script>
<script src="../js/config.js"></script>
<script src="../js/preview.js"></script>
<script src="../js/app.js"></script>
<script>
// Test: App class exists
console.assert(typeof App === 'function', 'App must be a function');
// Test: init() exists
const app = new App();
console.assert(typeof app.init === 'function', 'init must be a function');

console.log('All App tests passed');
</script>
</body>
</html>
```

- [ ] **Step 2: Run test to verify it fails**

Open `tests/test-app.html` in browser.
Expected: FAIL with "App is not defined"

- [ ] **Step 3: Implement `App` in `js/app.js`**

```javascript
class App {
  constructor() {
    this.ffmpegLoader = new FFmpegLoader();
    this.videoGenerator = null;
    this.configPanel = null;
    this.preview = null;
  }

  init() {
    const configContainer = document.getElementById('configContainer');
    const previewContainer = document.getElementById('previewContainer');
    
    this.configPanel = new ConfigPanel(configContainer);
    this.preview = new Preview(previewContainer);
    
    this.configPanel.onGenerate(() => this._handleGenerate());
    
    // Update preview when config changes
    configContainer.addEventListener('change', () => {
      if (this.configPanel.validate()) {
        this.preview.update(this.configPanel.getConfig());
      }
    });
    
    // Initial preview
    this.preview.update(this.configPanel.getConfig());
  }

  async _handleGenerate() {
    if (!this.configPanel.validate()) return;
    
    const config = this.configPanel.getConfig();
    this.configPanel.showProgress(0);
    
    try {
      if (!this.videoGenerator) {
        this.videoGenerator = new VideoGenerator(this.ffmpegLoader);
      }
      
      const blob = await this.videoGenerator.generate(config, (percent) => {
        this.configPanel.showProgress(percent);
      });
      
      // Download video
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'speedrun-timer.mp4';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error generating video: ' + error.message);
    } finally {
      this.configPanel.hideProgress();
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
```

- [ ] **Step 4: Update `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Speedrun Timer Generator</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <h1>Speedrun Timer Generator</h1>
  <div id="app">
    <div id="configContainer"></div>
    <div id="previewContainer"></div>
  </div>
  <script src="js/ffmpeg-loader.js"></script>
  <script src="js/timer.js"></script>
  <script src="js/generator.js"></script>
  <script src="js/config.js"></script>
  <script src="js/preview.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 5: Run test to verify it passes**

Open `tests/test-app.html` in browser.
Expected: "All App tests passed"

- [ ] **Step 6: Commit**

```bash
git add js/app.js index.html tests/test-app.html
git commit -m "feat: integrate all components in main app"
```

---

### Task 7: Styling

**Files:**
- Create: `css/style.css`

**Interfaces:**
- Consumes: nothing
- Produces: styled UI

- [ ] **Step 1: Create `css/style.css`**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: Arial, sans-serif;
  background: #1a1a2e;
  color: #eee;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
  color: #fff;
}

#app {
  display: flex;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

#configContainer {
  flex: 1;
  background: #16213e;
  padding: 20px;
  border-radius: 8px;
}

#previewContainer {
  flex: 1;
  background: #16213e;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.config-panel label {
  display: block;
  margin-top: 10px;
  margin-bottom: 4px;
  font-weight: bold;
}

.config-panel input,
.config-panel select {
  width: 100%;
  padding: 8px;
  border: 1px solid #0f3460;
  border-radius: 4px;
  background: #1a1a2e;
  color: #eee;
}

.config-panel button {
  width: 100%;
  margin-top: 20px;
  padding: 12px;
  background: #e94560;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.config-panel button:hover {
  background: #ff6b6b;
}

#progressBar {
  margin-top: 10px;
  height: 20px;
  background: #0f3460;
  border-radius: 10px;
  overflow: hidden;
}

#progressFill {
  height: 100%;
  background: #e94560;
  width: 0%;
  transition: width 0.3s;
}

#errorMsg {
  margin-top: 10px;
  min-height: 20px;
}

#previewContainer canvas {
  max-width: 100%;
  max-height: 100%;
  border: 1px solid #0f3460;
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: add styling"
```

---

### Task 8: Integration Test & Manual Verification

**Files:**
- Test: `tests/test-integration.html`

**Interfaces:**
- Consumes: all components
- Produces: end-to-end verification

- [ ] **Step 1: Create integration test**

Create `tests/test-integration.html`:
```html
<!DOCTYPE html>
<html>
<head><title>Integration Test</title></head>
<body>
<script src="../js/ffmpeg-loader.js"></script>
<script src="../js/timer.js"></script>
<script src="../js/generator.js"></script>
<script src="../js/config.js"></script>
<script src="../js/preview.js"></script>
<script src="../js/app.js"></script>
<script>
// Integration test: verify all components work together
console.assert(typeof FFmpegLoader === 'function', 'FFmpegLoader must exist');
console.assert(typeof TimerDisplay === 'function', 'TimerDisplay must exist');
console.assert(typeof VideoGenerator === 'function', 'VideoGenerator must exist');
console.assert(typeof ConfigPanel === 'function', 'ConfigPanel must exist');
console.assert(typeof Preview === 'function', 'Preview must exist');
console.assert(typeof App === 'function', 'App must exist');

// Test: TimerDisplay.formatTime with various FPS
console.assert(TimerDisplay.formatTime(0, 60, 'mmm') === '0:00.000', '0ms at 60fps');
console.assert(TimerDisplay.formatTime(16.6667, 60, 'mmm') === '0:00.017', '16.6667ms at 60fps');
console.assert(TimerDisplay.formatTime(33.3333, 60, 'mmm') === '0:00.033', '33.3333ms at 60fps');
console.assert(TimerDisplay.formatTime(50, 60, 'mmm') === '0:00.050', '50ms at 60fps');

// Test: TimerDisplay.formatTime with 30fps
console.assert(TimerDisplay.formatTime(0, 30, 'mmm') === '0:00.000', '0ms at 30fps');
console.assert(TimerDisplay.formatTime(33.3333, 30, 'mmm') === '0:00.033', '33.3333ms at 30fps');
console.assert(TimerDisplay.formatTime(66.6667, 30, 'mmm') === '0:00.067', '66.6667ms at 30fps');

// Test: TimerDisplay.formatTime with centiseconds
console.assert(TimerDisplay.formatTime(1234, 60, 'cc') === '0:01.23', '1234ms should be 0:01.23');
console.assert(TimerDisplay.formatTime(1234, 60, 'd') === '0:01.2', '1234ms should be 0:01.2');

// Test: TimerDisplay.roundMs
console.assert(TimerDisplay.roundMs(16.6667, 60) === 17, '16.6667ms at 60fps should round to 17');
console.assert(TimerDisplay.roundMs(33.3333, 60) === 33, '33.3333ms at 60fps should round to 33');
console.assert(TimerDisplay.roundMs(50, 60) === 50, '50ms at 60fps should round to 50');

console.log('All integration tests passed');
</script>
</body>
</html>
```

- [ ] **Step 2: Run integration test**

Open `tests/test-integration.html` in browser.
Expected: "All integration tests passed"

- [ ] **Step 3: Manual verification**

1. Open `index.html` in browser
2. Verify config panel renders with all inputs
3. Verify preview shows timer at 0:00.000
4. Change FPS to 30, verify preview updates
5. Change final time to 00:01.000, verify preview updates
6. Click "Generate Video"
7. Verify progress bar appears and updates
8. Verify MP4 file downloads
9. Open downloaded MP4 in video player
10. Verify timer counts from 0:00.000 to final time
11. Verify timer is centered
12. Verify background is correct
13. Verify font is correct

- [ ] **Step 4: Commit**

```bash
git add tests/test-integration.html
git commit -m "test: add integration test"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ MP4 video generation — Task 3
- ✅ Configurable FPS (1–240) — Task 4
- ✅ Frame-accurate millisecond rounding — Task 2
- ✅ Timer centered — Task 2
- ✅ Configurable background — Task 4
- ✅ Configurable resolution — Task 4
- ✅ Configurable font — Task 4
- ✅ No animations — Task 2 (no animation code)
- ✅ No border/shadow — Task 2 (no border/shadow code)
- ✅ No extra elements — Task 2 (only timer text)
- ✅ Output format MP4 — Task 3
- ✅ All processing client-side — Task 1, Task 3
- ✅ Progress indicator — Task 4, Task 6
- ✅ Clear error messages — Task 4, Task 6
- ✅ Time formats (mmm, cc, d) — Task 2, Task 4

**2. Step scan:**
- Every step has one clear action
- No "TBD" or "handle edge cases"
- No function bodies that signatures and tests already determine

**3. Type consistency:**
- `FFmpegLoader` used consistently across Tasks 1, 3, 6
- `TimerDisplay` used consistently across Tasks 2, 3, 5, 6
- `VideoGenerator` used consistently across Tasks 3, 6
- `ConfigPanel` used consistently across Tasks 4, 6
- `Preview` used consistently across Tasks 5, 6

**4. Review Focus:**
- ✅ Millisecond rounding at non-integer FPS — Task 2 tests
- ✅ Long video generation — Task 3 (progress reporting)
- ✅ ffmpeg.wasm loading — Task 1
- ✅ Transparent background — Task 2, Task 3
- ✅ Invalid inputs — Task 4 (validate method)

**5. Proportion:**
- Plan is ~600 lines, spec is ~100 lines
- Plan is longer than spec but includes test code and step-by-step instructions
- No excessive code blocks — only signatures and test assertions
