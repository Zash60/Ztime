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

  // Single source of truth for the font select. Values must match the
  // @font-face family names in css/fonts.css (plus the generic fallback).
  static getFontFamilies() {
    return [
      { value: 'JetBrains Mono', label: 'JetBrains Mono' },
      { value: 'Space Mono', label: 'Space Mono' },
      { value: 'Share Tech Mono', label: 'Share Tech Mono' },
      { value: 'Ubuntu Mono', label: 'Ubuntu Mono' },
      { value: 'Cascadia Code', label: 'Cascadia Code' },
      { value: 'VT323', label: 'VT323' },
      { value: 'monospace', label: 'System monospace' },
    ];
  }

  _render() {
    this.container.innerHTML = `
      <div class="config-panel">
        <h2>Timer Configuration</h2>

        <fieldset class="cfg-group">
          <legend>Timing</legend>

          <label for="finalTime">Final time</label>
          <input type="text" id="finalTime" value="01:00.000" placeholder="01:00.000"
            inputmode="numeric" autocomplete="off" spellcheck="false"
            aria-describedby="finalTimeHint finalTimeError">
          <p class="hint" id="finalTimeHint">Your run's final split — minutes, seconds, milliseconds.
            <span class="hint-example">Try 01:00.000 or 1:02:03.456 for runs over an hour.</span></p>
          <p class="field-error" id="finalTimeError" aria-live="polite"></p>

          <label for="fps">Frames per second</label>
          <input type="number" id="fps" value="60" min="1" max="240" step="1"
            aria-describedby="fpsHint fpsError">
          <p class="hint" id="fpsHint">Match your recording: 30 for most captures, 60 for smooth splits.</p>
          <p class="field-error" id="fpsError" aria-live="polite"></p>

          <label for="timeFormat">Time format</label>
          <select id="timeFormat" aria-describedby="formatExample timeFormatError">
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
          <p class="format-example" id="formatExample" aria-live="polite"></p>
          <p class="field-error" id="timeFormatError" aria-live="polite"></p>
        </fieldset>

        <fieldset class="cfg-group">
          <legend>Output</legend>

          <label for="resolution">Resolution</label>
          <select id="resolution">
            <option value="1280x720">1280x720 (HD)</option>
            <option value="1920x1080" selected>1920x1080 (Full HD)</option>
            <option value="3840x2160">3840x2160 (4K)</option>
          </select>

          <label for="background">Background</label>
          <select id="background">
            <option value="#000000">Black</option>
            <option value="#ffffff">White</option>
            <option value="#ff0000">Red</option>
            <option value="#00ff00">Green</option>
            <option value="#0000ff">Blue</option>
          </select>
        </fieldset>

        <details class="cfg-group cfg-details">
          <summary>Typography</summary>

          <label for="fontFamily">Font family</label>
          <select id="fontFamily">
            ${ConfigPanel.getFontFamilies().map((f, i) => `<option value="${f.value}"${i === 0 ? ' selected' : ''}>${f.label}</option>`).join('')}
          </select>

          <label for="fontSize">Font size (px)</label>
          <input type="number" id="fontSize" value="180" min="8" max="200" step="1"
            aria-describedby="fontSizeHint fontSizeError">
          <p class="hint" id="fontSizeHint">8–200 px. Big timers stay readable after upload compression.</p>
          <p class="field-error" id="fontSizeError" aria-live="polite"></p>

          <label for="fontColor">Font color</label>
          <input type="color" id="fontColor" value="#ffffff">
        </details>

        <button id="generateBtn">Generate Video</button>
        <button id="cancelBtn" style="display:none;">Cancel</button>
        <div id="estimate" style="min-height:20px;margin-top:6px;" aria-live="polite"></div>
        <div id="statusMsg" aria-live="polite" style="min-height:20px;margin-top:6px;"></div>
        <div id="progressBar" style="display:none;" role="progressbar" aria-label="Video generation progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div id="progressFill"></div>
        </div>
        <div id="successMsg" role="status" style="min-height:20px;margin-top:6px;"></div>
        <div id="errorMsg" role="alert" style="color:#ff6b6b;"></div>
      </div>
    `;

    this.container.querySelector('#generateBtn').addEventListener('click', () => {
      if (this.generateCallback) this.generateCallback();
    });
    this.container.querySelector('#cancelBtn').addEventListener('click', () => {
      if (this.cancelCallback) this.cancelCallback();
    });
    // Live format example: reformat the current final time whenever any
    // timing input changes. Guarded for test stubs without addEventListener.
    const timeFormat = this.container.querySelector('#timeFormat');
    if (timeFormat && typeof timeFormat.addEventListener === 'function') {
      timeFormat.addEventListener('change', () => this.updateFormatExample());
      timeFormat.addEventListener('input', () => this.updateFormatExample());
    }
    const finalTime = this.container.querySelector('#finalTime');
    if (finalTime && typeof finalTime.addEventListener === 'function') {
      finalTime.addEventListener('input', () => this.updateFormatExample());
    }
    const fps = this.container.querySelector('#fps');
    if (fps && typeof fps.addEventListener === 'function') {
      fps.addEventListener('input', () => this.updateFormatExample());
    }
    this.updateFormatExample();
  }

  // Live example string beside the format select: reformats the current
  // final-time input in the selected format (falls back gracefully when the
  // input is invalid or TimerDisplay is unavailable in unit tests).
  updateFormatExample() {
    const box = this.container.querySelector('#formatExample');
    if (!box) return;
    let raw;
    try {
      raw = this.container.querySelector('#finalTime').value;
    } catch (_) {
      return;
    }
    const ms = ConfigPanel.parseTime(raw);
    if (!Number.isFinite(ms) || ms <= 0) {
      box.textContent = 'Type a valid final time to preview the format.';
      return;
    }
    let fps = 60;
    try {
      const v = parseFloat(this.container.querySelector('#fps').value);
      if (Number.isFinite(v) && v >= 1 && v <= 240) fps = v;
    } catch (_) { /* keep default */ }
    let format = 'mmm';
    try {
      format = this.container.querySelector('#timeFormat').value || 'mmm';
    } catch (_) { /* keep default */ }
    let rendered = null;
    try {
      if (typeof TimerDisplay !== 'undefined' && TimerDisplay && typeof TimerDisplay.formatTime === 'function') {
        rendered = TimerDisplay.formatTime(ms, fps, format);
      }
    } catch (_) { rendered = null; }
    box.textContent = rendered === null
      ? `Final time reads as ${raw.trim()}.`
      : `Looks like this on the timer: ${rendered}`;
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
    const fieldErrors = {};

    if (!Number.isFinite(config.fps) || config.fps < 1 || config.fps > 240) {
      errors.push('FPS must be a number between 1 and 240');
      fieldErrors.fps = 'Enter 1–240 (30 for most captures, 60 for smooth splits).';
    }
    if (!Number.isFinite(config.finalTimeMs) || config.finalTimeMs <= 0) {
      errors.push('Final time must be valid (MM:SS.mmm) and greater than 0');
      fieldErrors.finalTime = 'Use minutes, seconds, milliseconds — e.g. 01:00.000.';
    }
    if (!Number.isFinite(config.width) || !Number.isFinite(config.height) || config.width <= 0 || config.height <= 0) {
      errors.push('Resolution must be positive');
    }
    if (!Number.isFinite(config.font.size) || config.font.size < 8 || config.font.size > 200) {
      errors.push('Font size must be between 8 and 200 px');
      fieldErrors.fontSize = 'Enter 8–200 px.';
    }

    this._setFieldError('fpsError', 'fps', fieldErrors.fps);
    this._setFieldError('finalTimeError', 'finalTime', fieldErrors.finalTime);
    this._setFieldError('fontSizeError', 'fontSize', fieldErrors.fontSize);

    const errorMsg = this.container.querySelector('#errorMsg');
    if (errors.length > 0) {
      errorMsg.textContent = errors.join(', ');
      return false;
    }
    errorMsg.textContent = '';
    return true;
  }

  _setFieldError(errorId, inputId, message) {
    let box;
    try {
      box = this.container.querySelector('#' + errorId);
    } catch (_) {
      return;
    }
    if (!box) return;
    try {
      box.textContent = message || '';
      const input = this.container.querySelector('#' + inputId);
      if (input && typeof input.setAttribute === 'function') {
        if (message) input.setAttribute('aria-invalid', 'true');
        else if (typeof input.removeAttribute === 'function') input.removeAttribute('aria-invalid');
      }
    } catch (_) { /* test stubs: keep summary error only */ }
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

  showSuccess(message) {
    const box = this.container.querySelector('#successMsg');
    if (!box) return;
    // Structured finish-line card when given { time, detail };
    // plain string stays a simple status line for backwards compat.
    try {
      box.classList.remove('finish');
    } catch (_) { /* test stubs */ }
    if (message && typeof message === 'object') {
      const time = String(message.time || '');
      const detail = String(message.detail || '');
      box.innerHTML = '';
      const flag = document.createElement('div');
      flag.className = 'finish-flag';
      flag.setAttribute('aria-hidden', 'true');
      const body = document.createElement('div');
      body.className = 'finish-body';
      const label = document.createElement('div');
      label.className = 'finish-label';
      label.textContent = 'Time!';
      const timeEl = document.createElement('div');
      timeEl.className = 'finish-time';
      timeEl.textContent = time;
      const detailEl = document.createElement('div');
      detailEl.className = 'finish-detail';
      detailEl.textContent = detail;
      body.appendChild(label);
      body.appendChild(timeEl);
      if (detail) body.appendChild(detailEl);
      box.appendChild(flag);
      box.appendChild(body);
      try {
        box.classList.add('finish');
      } catch (_) { /* test stubs */ }
      return;
    }
    box.textContent = message;
  }

  clearSuccess() {
    const box = this.container.querySelector('#successMsg');
    if (!box) return;
    try {
      box.classList.remove('finish');
    } catch (_) { /* test stubs */ }
    if (box) box.textContent = '';
    // innerHTML may hold the finish card; clear it without dropping the node.
    try {
      box.innerHTML = '';
    } catch (_) { /* test stubs */ }
  }

  updateEstimate(est) {
    const box = this.container.querySelector('#estimate');
    const heavy4k = est.frames > 1800 && this._estimateIs4k();
    const warn = est.frames > 7200 || heavy4k
      ? ' — big render: keep this tab in front until it finishes.'
      : '';
    try {
      box.textContent = `${est.frames} frames · ${est.seconds}s video${warn}`;
      if (typeof box.classList !== 'undefined' && box.classList) {
        box.classList.toggle('estimate-warning', warn.length > 0);
      }
    } catch (_) {
      box.textContent = `${est.frames} frames · ${est.seconds}s video${warn}`;
    }
  }

  _estimateIs4k() {
    try {
      const v = this.container.querySelector('#resolution').value || '';
      return v.indexOf('3840') === 0;
    } catch (_) {
      return false;
    }
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
    try {
      bar.setAttribute('aria-valuenow', String(percent));
    } catch (_) { /* test stubs */ }
  }

  hideProgress() {
    this.container.querySelector('#progressBar').style.display = 'none';
  }
}
