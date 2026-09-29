class VideoGenerator {
  constructor(ffmpegLoader) {
    this.ffmpegLoader = ffmpegLoader;
    this.cancelled = false;
  }

  cancel() {
    this.cancelled = true;
  }

  static cancelledError() {
    const err = new Error('Generation cancelled');
    err.code = 'CANCELLED';
    return err;
  }

  _checkCancelled() {
    if (this.cancelled) throw VideoGenerator.cancelledError();
  }

  // Frame-count forecast for the estimate shown before generation starts.
  static estimate({ fps, finalTimeMs }) {
    const times = VideoGenerator.frameTimes(finalTimeMs, fps);
    return { frames: times.length, seconds: finalTimeMs / 1000 };
  }

  // MP4 (H.264/yuv420p) cannot carry an alpha channel. Resolve "transparent"
  // to an explicit opaque fallback so the export is never silently wrong.
  static effectiveBackground(background) {
    return background === 'transparent' ? '#000000' : background;
  }

  // x264 encode arguments. `-preset veryfast` encodes ~2-4x faster than the
  // ffmpeg default (medium); `-crf 18` targets HIGHER quality than the
  // default crf 23 (lower CRF = less compression = better). Preset only
  // changes the speed/compression-ratio tradeoff at a fixed CRF, so output
  // quality is preserved (file size grows instead). Codec and pixel format
  // are unchanged.
  static encodeArgs(fps) {
    return [
      '-framerate', String(fps),
      '-i', 'frame_%06d.png',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      'output.mp4',
    ];
  }

  // Progress throttle: only notify when the rounded percent changes, so a
  // 3600-frame video fires ~100 DOM updates instead of ~3600.
  static shouldReport(lastRounded, percent) {
    return Math.min(100, Math.round(percent)) !== lastRounded;
  }

  // Frame display times in ms: starts at 0 and always ends exactly at
  // finalTimeMs, so the requested final time is visible in the video.
  static frameTimes(finalTimeMs, fps) {
    const frameDuration = 1000 / fps;
    const totalFrames = Math.ceil((finalTimeMs / 1000) * fps);
    const times = [];
    for (let i = 0; i <= totalFrames; i++) {
      times.push(Math.min(i * frameDuration, finalTimeMs));
    }
    return times;
  }

  _yieldToUI() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  async generate(config, onProgress, onPhase) {
    this.cancelled = false;
    const { fps, finalTimeMs, width, height, background, font, format } = config;

    // Load ffmpeg
    const ffmpeg = await this.ffmpegLoader.load();
    this._checkCancelled();

    const times = VideoGenerator.frameTimes(finalTimeMs, fps);
    const encodeBackground = VideoGenerator.effectiveBackground(background);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const report = (() => {
      let lastRounded = -1;
      return (percent) => {
        if (onProgress && VideoGenerator.shouldReport(lastRounded, percent)) {
          lastRounded = Math.min(100, Math.round(percent));
          onProgress(lastRounded);
        }
      };
    })();
    const phase = (text) => {
      if (onPhase) onPhase(text);
    };

    // Single pass: draw every frame, then one encode. No segments, no concat.
    // The frame painter hoists static canvas state (font, alignment) out of
    // the loop — per-frame work is only fillRect + fillText.
    const pending = new Set();
    const paint = TimerDisplay.createFramePainter(canvas, {
      background: encodeBackground, font, format,
    });

    try {
      phase('Drawing frames…');
      for (let i = 0; i < times.length; i++) {
        this._checkCancelled();
        paint(times[i], fps);

        // Convert canvas to blob and write to ffmpeg
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const frameName = `frame_${String(i).padStart(6, '0')}.png`;
        ffmpeg.FS('writeFile', frameName, uint8Array);
        pending.add(frameName);

        // Yield periodically so the UI (incl. progress bar) stays responsive
        if (i % 60 === 0) await this._yieldToUI();

        report(((i + 1) / times.length) * 90);
      }

      // One encode of the whole timeline
      this._checkCancelled();
      phase('Encoding video…');
      await ffmpeg.run(...VideoGenerator.encodeArgs(fps));
      report(100);

      // Read output (slice to the view's byte range, not the whole WASM heap)
      const data = ffmpeg.FS('readFile', 'output.mp4');
      const blob = new Blob(
        [data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)],
        { type: 'video/mp4' }
      );

      // Cleanup (every pending file exists exactly once here)
      for (const n of pending) {
        ffmpeg.FS('unlink', n);
      }
      ffmpeg.FS('unlink', 'output.mp4');

      return blob;
    } catch (err) {
      // On cancel, free whatever this run wrote (best effort) and rethrow.
      if (err && err.code === 'CANCELLED') {
        for (const n of pending) {
          try { ffmpeg.FS('unlink', n); } catch (_) { /* already gone */ }
        }
      }
      throw err;
    }
  }
}
