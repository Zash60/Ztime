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

  // Ensures a timer font is loaded before canvas draws use it — otherwise
  // the browser silently substitutes a fallback. Safe no-op without a
  // document (Node tests) or when the Font Loading API is unavailable.
  static async ensureFont(font) {
    if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.load !== 'function') return;
    try {
      await document.fonts.load(`${font.size}px "${font.family}"`, '0123456789:,.');
    } catch (_) { /* fall back to whatever is available */ }
  }
  // Frame painter: hoists static canvas state (context, font, alignment)
  // once, so per-frame work is only fillRect + fillText. Drawing output is
  // identical to draw() — this is purely fewer state changes per frame.
  static createFramePainter(canvas, options) {
    const { width, height } = canvas;
    const { background, font, format } = options;
    const opaque = background !== 'transparent';
    let ctx;
    try {
      ctx = canvas.getContext('2d', { alpha: !opaque, desynchronized: true });
    } catch (_) {
      ctx = canvas.getContext('2d');
    }
    if (!ctx) ctx = canvas.getContext('2d');
    ctx.font = `${font.size}px ${font.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = width / 2;
    const cy = height / 2;

    return (timeMs, fps) => {
      // Clear and draw background
      if (!opaque) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw timer text
      const text = TimerDisplay.formatTime(timeMs, fps, format);
      ctx.fillStyle = font.color;
      ctx.fillText(text, cx, cy);
    };
  }

  static draw(canvas, timeMs, fps, options) {
    TimerDisplay.createFramePainter(canvas, options)(timeMs, fps);
  }
}
