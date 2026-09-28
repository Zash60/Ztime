class TimerDisplay {
  static roundMs(timeMs, fps) {
    // Snap to the nearest frame gridline for this fps, then round to
    // whole milliseconds for display (60fps frames show 000, 017, 033…).
    const frameDuration = 1000 / fps;
    const gridTime = Math.round(timeMs / frameDuration) * frameDuration;
    return Math.round(gridTime);
  }

  static formatTime(timeMs, fps, format = 'mmm') {
    const roundedMs = this.roundMs(timeMs, fps);
    const totalSeconds = Math.floor(roundedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor(roundedMs % 1000);

    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    const fraction = (digits) => {
      if (digits === 2) return String(Math.floor(ms / 10)).padStart(2, '0');
      if (digits === 1) return String(Math.floor(ms / 100));
      return String(ms).padStart(3, '0');
    };

    switch (format) {
      case 'hmmm': return `${hours}:${mm}:${ss}.${fraction(3)}`;
      case 'hcc': return `${hours}:${mm}:${ss}.${fraction(2)}`;
      case 'hd': return `${hours}:${mm}:${ss}.${fraction(1)}`;
      case 'hs': return `${hours}:${mm}:${ss}`;
      case 'ssmmm': return `${totalSeconds}.${fraction(3)}`;
      case 'sscc': return `${totalSeconds}.${fraction(2)}`;
      case 'ssd': return `${totalSeconds}.${fraction(1)}`;
      case 's': return `${Math.floor(totalSeconds / 60)}:${ss}`;
      case 'cc': return `${Math.floor(totalSeconds / 60)}:${ss}.${fraction(2)}`;
      case 'd': return `${Math.floor(totalSeconds / 60)}:${ss}.${fraction(1)}`;
      case 'mmm':
      default: return `${Math.floor(totalSeconds / 60)}:${ss}.${fraction(3)}`;
    }
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
