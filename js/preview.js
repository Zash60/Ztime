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
