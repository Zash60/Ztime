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
