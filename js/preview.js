class Preview {
  constructor(container) {
    this.container = container;
    this.figure = document.createElement('figure');
    this.canvas = document.createElement('canvas');
    this.caption = document.createElement('figcaption');
    // DOM enhancements, guarded for unit-test stubs whose createElement
    // returns a bare canvas mock (no setAttribute/appendChild/classList).
    try {
      if (this.figure && typeof this.figure.className !== 'undefined') this.figure.className = 'monitor';
      if (this.canvas && typeof this.canvas.setAttribute === 'function') this.canvas.setAttribute('role', 'img');
      if (this.caption && typeof this.caption.className !== 'undefined') this.caption.className = 'monitor-caption';
      if (this.figure && typeof this.figure.appendChild === 'function') {
        this.figure.appendChild(this.canvas);
        this.figure.appendChild(this.caption);
      }
    } catch (_) { /* keep bare-canvas fallback */ }
    try {
      if (this.figure && typeof this.figure.appendChild === 'function') this.container.appendChild(this.figure);
      else this.container.appendChild(this.canvas);
    } catch (_) { /* test stubs */ }
  }

  update(config) {
    const { fps, width, height, background, font, format } = config;

    this.canvas.width = width;
    this.canvas.height = height;

    // Output-monitor treatment: the caption names the real dimensions.
    try {
      if (this.caption) this.caption.textContent = `${width}×${height} · ${background}`;
    } catch (_) { /* test stubs */ }

    // Draw initial frame (time = 0) once the font is ready, so the preview
    // never shows a fallback-font flash.
    TimerDisplay.ensureFont(font).then(() => {
      TimerDisplay.draw(this.canvas, 0, fps, { background, font, format });
      try {
        if (this.canvas && typeof this.canvas.setAttribute === 'function') {
          const label = TimerDisplay.formatTime(0, fps, format);
          this.canvas.setAttribute('aria-label', `Timer preview showing ${label} at ${width} by ${height} pixels`);
        }
      } catch (_) { /* non-DOM test stubs */ }
    });
  }

  getCanvas() {
    return this.canvas;
  }
}
