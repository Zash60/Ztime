class TimerDisplay {
  static roundMs(timeMs, fps) {
    return Math.round(timeMs);
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
