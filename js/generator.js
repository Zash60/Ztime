class VideoGenerator {
  constructor() {
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

  // Target bitrate in bits/sec (~0.25 bits/pixel at 30fps, scaled up with
  // fps so per-frame quality holds at high frame rates; never scaled below
  // the 30fps baseline). Visually lossless for flat timer graphics on
  // hardware H.264; file size grows instead of quality dropping.
  static bitrateFor(width, height, fps) {
    return Math.round(width * height * 0.25 * Math.max(1, fps / 30));
  }

  // Exact per-frame timestamps in seconds plus the constant frame duration.
  // Duration is 1/fps for every frame (last frame included), so the output
  // duration equals times.length/fps — the same duration the previous
  // software-encode engine produced for the same frame plan.
  static framePlan(finalTimeMs, fps) {
    return {
      times: VideoGenerator.frameTimes(finalTimeMs, fps).map((ms) => ms / 1000),
      duration: 1 / fps,
    };
  }

  // fps metadata for the track: only integer fps or exact standard
  // fractional rates (23.976/29.97/59.94 as exact x/1001 divisions).
  // Arbitrary fractional fps relies on exact per-frame durations instead.
  static trackOptions(fps) {
    const standards = [24000 / 1001, 30000 / 1001, 60000 / 1001];
    const known = Number.isInteger(fps) ||
      standards.some((s) => Math.abs(fps - s) < 1e-9);
    return known ? { frameRate: fps } : {};
  }

  // Runtime capability gate. Never throws: returns ok:false with a
  // human-readable reason when WebCodecs H.264 encoding is unavailable.
  static async checkSupport(width, height) {
    if (typeof VideoEncoder === 'undefined') {
      return { ok: false, reason: 'this browser has no WebCodecs VideoEncoder' };
    }
    try {
      const result = await VideoEncoder.isConfigSupported({
        codec: 'avc1.420034', width, height,
      });
      if (!result || result.supported === false) {
        return { ok: false, reason: 'this browser cannot encode H.264 at this resolution' };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: 'H.264 support check failed: ' + (err && err.message ? err.message : err) };
    }
  }
  // Mediabunny is vendored (no runtime CDN). The indirection through
  // _importMuxer exists so tests can stub the module.
  static _importMuxer() {
    return import('/vendor/mediabunny/mediabunny.min.mjs');
  }

  // Loads (once, cached) and validates the muxer module. A failed load
  // resets the cache so the error panel's retry can try again (never wedged).
  static loadMuxer() {
    if (!VideoGenerator._muxerPromise) {
      VideoGenerator._muxerPromise = VideoGenerator._importMuxer().then(
        (mod) => {
          for (const name of ['Output', 'Mp4OutputFormat', 'BufferTarget', 'CanvasSource', 'Quality']) {
            if (!mod || !mod[name]) {
              throw new Error('Video encoding library failed to load (/vendor/mediabunny): missing ' + name);
            }
          }
          return mod;
        },
        (err) => {
          VideoGenerator._muxerPromise = null;
          throw err;
        }
      );
    }
    return VideoGenerator._muxerPromise;
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

  // Wraps an encoder failure into the user-facing "unsupported" message.
  static unsupportedError(reason) {
    return new Error(
      'Cannot generate video: ' + reason + ' (WebCodecs H.264 encoding is required)'
    );
  }

  async generate(config, onProgress, onPhase) {
    this.cancelled = false;
    const { fps, finalTimeMs, width, height, background, font, format } = config;

    // Capability gate first: never start work the browser cannot finish.
    const support = await VideoGenerator.checkSupport(width, height);
    if (!support.ok) throw VideoGenerator.unsupportedError(support.reason);
    this._checkCancelled();

    const mux = await VideoGenerator.loadMuxer();
    this._checkCancelled();

    const plan = VideoGenerator.framePlan(finalTimeMs, fps);
    const encodeBackground = VideoGenerator.effectiveBackground(background);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const report = (() => {
      let lastRounded = -1;
      return (percent, extra) => {
        if (onProgress && VideoGenerator.shouldReport(lastRounded, percent)) {
          lastRounded = Math.min(100, Math.round(percent));
          onProgress(lastRounded, extra);
        }
      };
    })();
    const phase = (text) => {
      if (onPhase) onPhase(text);
    };

    // The frame painter hoists static canvas state (font, alignment) out of
    // the loop — per-frame work is only fillRect + fillText. The font must
    // be loaded before the painter snapshots it.
    await TimerDisplay.ensureFont(font);
    this._checkCancelled();
    const paint = TimerDisplay.createFramePainter(canvas, {
      background: encodeBackground, font, format,
    });

    const output = new mux.Output({
      format: new mux.Mp4OutputFormat(),
      target: new mux.BufferTarget(),
    });
    const source = new mux.CanvasSource(canvas, {
      codec: 'avc',
      // Realtime mode: no B-frames or pipeline delay, so the first frame
      // presents at t=0 instead of after an encoder-delay gap.
      latencyMode: 'realtime',
      quality: new mux.Quality({ bitrate: VideoGenerator.bitrateFor(width, height, fps) }),
    });
    output.addVideoTrack(source, VideoGenerator.trackOptions(fps));

    try {
      try {
        await output.start();
      } catch (err) {
        throw VideoGenerator.unsupportedError(err && err.message ? err.message : String(err));
      }
      this._checkCancelled();

      phase('Drawing frames…');
      for (let i = 0; i < plan.times.length; i++) {
        this._checkCancelled();
        paint(plan.times[i] * 1000, fps);
        // Awaited: respects writer and encoder backpressure (required by the
        // source contract; fire-and-forget starves hardware encoders).
        try {
          await source.add(plan.times[i], plan.duration);
        } catch (err) {
          throw VideoGenerator.unsupportedError(err && err.message ? err.message : String(err));
        }

        // Yield periodically so the UI (incl. progress bar) stays responsive
        if (i % 60 === 0) await this._yieldToUI();

        report(((i + 1) / plan.times.length) * 90, {
          frame: i + 1,
          total: plan.times.length,
          timeMs: plan.times[i] * 1000,
        });
      }

      // Flush the encoder and finish the file
      this._checkCancelled();
      phase('Encoding video…');
      await output.finalize();
      report(100, { frame: plan.times.length, total: plan.times.length, timeMs: finalTimeMs });

      return new Blob([output.target.buffer], { type: 'video/mp4' });
    } catch (err) {
      // Free encoder resources on every failure path (cancel or error),
      // then rethrow.
      try { await output.cancel(); } catch (_) { /* already gone */ }
      throw err;
    }
  }
}
