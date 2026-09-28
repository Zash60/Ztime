class ConfigPanel {
  constructor(container) {
    this.container = container;
    this.generateCallback = null;
    this.cancelCallback = null;
    this._render();
  }

  // Parse "MM:SS.mmm" or "HH:MM:SS.mmm" → milliseconds.
  // Returns NaN for malformed input, never throws.
  static parseTime(str) {
    if (typeof str !== 'string') return NaN;
    const parts = str.split(':');
    if (parts.length !== 2 && parts.length !== 3) return NaN;
    const secParts = parts[parts.length - 1].split('.');
    if (secParts.length > 2) return NaN;
    const seconds = Number(secParts[0]);
    const ms = secParts.length === 2 ? Number(secParts[1].padEnd(3, '0').slice(0, 3)) : 0;
    const minutes = Number(parts[parts.length - 2]);
    const hours = parts.length === 3 ? Number(parts[0]) : 0;
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(ms)) return NaN;
    if (hours < 0 || minutes < 0 || seconds < 0 || ms < 0) return NaN;
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + ms;
  }

  _render() {
    this.container.innerHTML = `
      <div class="config-panel">
        <h2>Timer Configuration</h2>

        <label>FPS (1-240):</label>
        <input type="number" id="fps" value="60" min="1" max="240">

        <label>Final Time (MM:SS.mmm or HH:MM:SS.mmm):</label>
        <input type="text" id="finalTime" value="01:00.000" placeholder="01:00.000">

        <label>Resolution:</label>
        <select id="resolution">
          <option value="1280x720">1280x720 (HD)</option>
          <option value="1920x1080" selected>1920x1080 (Full HD)</option>
          <option value="3840x2160">3840x2160 (4K)</option>
        </select>

        <label>Background:</label>
        <select id="background">
          <option value="transparent">Transparent (exports as black in MP4)</option>
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
          <option value="s">M:SS</option>
          <option value="hmmm">H:MM:SS.mmm</option>
          <option value="hcc">H:MM:SS.cc</option>
          <option value="hd">H:MM:SS.d</option>
          <option value="hs">H:MM:SS</option>
          <option value="ssmmm">SS.mmm</option>
          <option value="sscc">SS.cc</option>
          <option value="ssd">SS.d</option>
        </select>

        <button id="generateBtn">Generate Video</button>
        <button id="cancelBtn" style="display:none;">Cancel</button>
        <div id="estimate" style="min-height:20px;margin-top:6px;"></div>
        <div id="statusMsg" aria-live="polite" style="min-height:20px;margin-top:6px;"></div>
        <div id="progressBar" style="display:none;">
          <div id="progressFill"></div>
        </div>
        <div id="errorMsg" role="alert" style="color:#ff6b6b;"></div>
      </div>
    `;

    this.container.querySelector('#generateBtn').addEventListener('click', () => {
      if (this.generateCallback) this.generateCallback();
    });
    this.container.querySelector('#cancelBtn').addEventListener('click', () => {
      if (this.cancelCallback) this.cancelCallback();
    });
  }

  getConfig() {
    const [width, height] = this.container.querySelector('#resolution').value.split('x').map(Number);
    const finalTimeMs = ConfigPanel.parseTime(this.container.querySelector('#finalTime').value);

    return {
      fps: parseFloat(this.container.querySelector('#fps').value),
      finalTimeMs,
      width,
      height,
      background: this.container.querySelector('#background').value,
      font: {
        family: this.container.querySelector('#fontFamily').value,
        size: parseFloat(this.container.querySelector('#fontSize').value),
        color: this.container.querySelector('#fontColor').value,
      },
      format: this.container.querySelector('#timeFormat').value,
    };
  }

  validate() {
    const config = this.getConfig();
    const errors = [];

    if (!Number.isFinite(config.fps) || config.fps < 1 || config.fps > 240) {
      errors.push('FPS must be a number between 1 and 240');
    }
    if (!Number.isFinite(config.finalTimeMs) || config.finalTimeMs <= 0) {
      errors.push('Final time must be valid (MM:SS.mmm) and greater than 0');
    }
    if (!Number.isFinite(config.width) || !Number.isFinite(config.height) || config.width <= 0 || config.height <= 0) {
      errors.push('Resolution must be positive');
    }
    if (!Number.isFinite(config.font.size) || config.font.size <= 0) {
      errors.push('Font size must be a positive number');
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

  onCancel(callback) {
    this.cancelCallback = callback;
  }

  showError(message) {
    const box = this.container.querySelector('#errorMsg');
    box.innerHTML = '<span class="error-text"></span> <button type="button" id="retryBtn">Try again</button>';
    box.querySelector('.error-text').textContent = message;
    box.querySelector('#retryBtn').addEventListener('click', () => {
      this.hideError();
      if (this.generateCallback) this.generateCallback();
    });
  }

  hideError() {
    this.container.querySelector('#errorMsg').innerHTML = '';
  }

  updateEstimate(est) {
    this.container.querySelector('#estimate').textContent =
      `${est.frames} frames · ${est.seconds}s video · ${est.chunks} segment(s)`;
  }

  clearEstimate() {
    this.container.querySelector('#estimate').textContent = '';
  }

  setStatus(text) {
    this.container.querySelector('#statusMsg').textContent = text;
  }

  clearStatus() {
    this.container.querySelector('#statusMsg').textContent = '';
  }

  setGenerating(busy) {
    this.container.querySelector('#generateBtn').disabled = !!busy;
    this.container.querySelector('#cancelBtn').style.display = busy ? 'block' : 'none';
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
