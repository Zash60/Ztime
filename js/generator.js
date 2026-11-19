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
  // Base-path aware URL for the vendored muxer module. Resolves against
  // the document so the app works from a domain root (local server) and
  // from a project subpath (https://<user>.github.io/<repo/> on GitHub
  // Pages), where a root-absolute "/vendor/..." URL 404s.
  static muxerURL() {
    if (typeof document !== 'undefined' && document.baseURI) {
      return new URL('vendor/mediabunny/mediabunny.min.mjs', document.baseURI).href;
    }
    return '/vendor/mediabunny/mediabunny.min.mjs';
  }

  // Mediabunny is vendored (no runtime CDN). The indirection through
  // _importMuxer exists so tests can stub the module.
  static _importMuxer() {
    return import(VideoGenerator.muxerURL());
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

  // The file name used for both the suggested save name and the fallback
  // blob download.
  static suggestedName() {
    return 'speedrun-timer.mp4';
  }

  // Encoder settings shared by the worker and the main-thread fallback, so
  // both paths produce the same file.
  static encoderSettings(config) {
    return {
      bitrate: VideoGenerator.bitrateFor(config.width, config.height, config.fps),
      frameRate: VideoGenerator.trackOptions(config.fps).frameRate || null,
    };
  }

  // URL of the encode worker, resolved against the document so the app works
  // from a domain root and from a project subpath.
  static workerURL() {
    if (typeof document !== 'undefined' && document.baseURI) {
      return new URL('js/encode-worker.js', document.baseURI).href;
    }
    return '/js/encode-worker.js';
  }

  // Asks the user where to stream the finished MP4, but only when asked to
  // and only in browsers with the File System Access API. Any failure other
  // than a user abort falls back to an in-memory export, so generation is
  // never blocked by the picker. A user abort cancels the export quietly.
  async _pickSaveHandle(config) {
    if (!config || !config.saveToDisk) return null;
    if (typeof window === 'undefined' || typeof window.showSaveFilePicker !== 'function') {
      return null;
    }
    try {
      return await window.showSaveFilePicker({
        suggestedName: VideoGenerator.suggestedName(),
        types: [{ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } }],
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        const cancelled = VideoGenerator.cancelledError();
        cancelled.message = 'Save cancelled.';
        throw cancelled;
      }
      return null;
    }
  }

  // Emits the per-export timing breakdown to the console (and stashes it on
  // window for tests) so the cost of painting vs. encoding vs. finalizing
  // is measurable instead of guessed.
  static reportTimings(timings) {
    if (!timings) return;
    try {
      console.info('[Ztime] encode timing', timings);
    } catch (_) { /* console unavailable */ }
    try {
      if (typeof window !== 'undefined') window.__ztimeTimings = timings;
    } catch (_) { /* ignore */ }
  }

  async generate(config, onProgress, onPhase, opts) {
    this.cancelled = false;
    opts = opts || {};

    // Capability gate first: never start work the browser cannot finish
    // (and never show a save dialog for it either).
    const support = await VideoGenerator.checkSupport(config.width, config.height);
    if (!support.ok) throw VideoGenerator.unsupportedError(support.reason);
    this._checkCancelled();

    const plan = VideoGenerator.framePlan(config.finalTimeMs, config.fps);
    const encoderSettings = VideoGenerator.encoderSettings(config);

    // Painting needs the document fonts, so both paths rasterize frames on
    // the main thread; the worker handles wrapping, encoding and muxing.
    await TimerDisplay.ensureFont(config.font);
    this._checkCancelled();

    // opts.saveHandle exists for tests and advanced callers; production goes
    // through the picker (only when the user enabled disk streaming).
    const saveHandle = Object.prototype.hasOwnProperty.call(opts, 'saveHandle')
      ? opts.saveHandle
      : await this._pickSaveHandle(config);
    this._checkCancelled();

    const startedAt = performance.now();
    let result;
    try {
      result = await this._generateViaWorker(
        config, plan, saveHandle, encoderSettings, onProgress, onPhase, startedAt
      );
    } catch (err) {
      if (this.cancelled || (err && err.code === 'CANCELLED')) throw err;
      if (err && err.streamStarted) {
        // A partial file may already exist on disk — do not silently
        // double-encode over it, surface the failure instead.
        throw err;
      }
      // The worker died before anything was written (missing APIs, import
      // failure, encoder error). Retry entirely in-page. If a save handle
      // was involved it was aborted by the worker, so re-using it simply
      // replaces an empty, aborted file.
      result = await this._generateViaMainThread(
        config, plan, saveHandle, encoderSettings, onProgress, onPhase, startedAt
      );
    }
    VideoGenerator.reportTimings(result.timings);
    return result;
  }

  // Worker pipeline: the main thread paints + transfers ImageBitmaps, the
  // worker owns VideoEncoder + muxer + optional disk stream.
  _generateViaWorker(config, plan, saveHandle, encoderSettings, onProgress, onPhase, startedAt) {
    return new Promise((resolve, reject) => {
      let worker;
      try {
        worker = new Worker(VideoGenerator.workerURL(), { type: 'module' });
      } catch (err) {
        const e = new Error('Web Worker unavailable: ' + (err && err.message ? err.message : err));
        e.setupFailed = true;
        reject(e);
        return;
      }

      const encodeBackground = VideoGenerator.effectiveBackground(config.background);
      const canvas = document.createElement('canvas');
      canvas.width = config.width;
      canvas.height = config.height;
      // Painter hoists static canvas state; font was ensured by generate().
      const paint = TimerDisplay.createFramePainter(canvas, {
        background: encodeBackground,
        font: config.font,
        format: config.format,
      });

      const totalFrames = plan.times.length;
      const suggestedName = VideoGenerator.suggestedName();
      let paintMs = 0;
      let bitmapMs = 0;
      let settled = false;
      // Startup watchdog: if the worker never posts 'ready' (hung or
      // un-loadable module), bail out so the caller can fall back in-page.
      const readyWatchdog = setTimeout(() => {
        const err = new Error('Encode worker failed to initialize in time');
        err.setupFailed = true;
        finish(() => reject(err));
      }, 15000);

      const finish = (fn) => {
        if (settled) return;
        settled = true;
        clearTimeout(readyWatchdog);
        try { worker.terminate(); } catch (_) { /* already gone */ }
        fn();
      };

      // Same ~100 DOM updates per export as before (ui churn unchanged).
      let lastRounded = -1;
      const relayProgress = (m) => {
        if (!onProgress) return;
        const min = Math.min(100, Math.round(m.percent));
        if (min !== lastRounded) {
          lastRounded = min;
          onProgress(min, m);
        }
      };

      worker.onmessage = (event) => {
        const m = event.data || {};
        if (m.type === 'phase') {
          if (onPhase) onPhase(m.text);
          return;
        }
        if (m.type === 'ready') {
          if (onPhase) onPhase('Drawing frames…');
          pump();
          return;
        }
        if (m.type === 'frame-done') {
          frameDone();
          return;
        }
        if (m.type === 'progress') {
          relayProgress(m);
          return;
        }
        if (m.type === 'done') {
          const timings = Object.assign(
            { frames: totalFrames, paintMs: Math.round(paintMs), bitmapMs: Math.round(bitmapMs),
              totalMs: Math.round(performance.now() - startedAt), engine: 'worker' },
            m.timings || {}
          );
          if (m.streamed) {
            finish(() => resolve({ streamed: true, suggestedName, timings }));
          } else {
            finish(() => resolve({
              blob: new Blob([m.buffer], { type: 'video/mp4' }),
              suggestedName,
              timings,
            }));
          }
          return;
        }
        if (m.type === 'cancelled') {
          finish(() => reject(VideoGenerator.cancelledError()));
          return;
        }
        if (m.type === 'error') {
          const err = new Error(m.message || 'Video worker failed');
          err.streamStarted = Boolean(saveHandle) && m.phase !== 'setup';
          if (m.phase === 'setup') err.setupFailed = true;
          finish(() => reject(err));
          return;
        }
      };

      worker.onerror = (event) => {
        // Load/parse failure — nothing was streamed yet.
        const err = new Error('Encode worker failed to start: ' + ((event && event.message) || 'unknown error'));
        err.setupFailed = true;
        err.streamStarted = false;
        finish(() => reject(err));
      };

      // Bounded in-flight window: backpressure without unbounded bitmaps.
      const MAX_IN_FLIGHT = 3;
      let inFlight = 0;
      let nextIndex = 0;
      let frameWaiter = null;
      const frameDone = () => {
        inFlight -= 1;
        if (frameWaiter) {
          const w = frameWaiter;
          frameWaiter = null;
          w();
        }
      };

      const pump = async () => {
        try {
          while (nextIndex < totalFrames) {
            this._checkCancelled();
            if (this.cancelled) {
              worker.postMessage({ type: 'cancel' });
              return; // completion arrives as 'cancelled'
            }
            if (inFlight >= MAX_IN_FLIGHT) {
              await new Promise((r) => { frameWaiter = r; });
              continue;
            }
            const i = nextIndex;
            nextIndex += 1;
            const tPaint = performance.now();
            paint(plan.times[i] * 1000, config.fps);
            paintMs += performance.now() - tPaint;
            const tBitmap = performance.now();
            const bitmap = await createImageBitmap(canvas);
            bitmapMs += performance.now() - tBitmap;
            worker.postMessage({ type: 'frame', index: i, bitmap }, [bitmap]);
            inFlight += 1;
            if (i % 60 === 0) await this._yieldToUI();
          }
        } catch (err) {
          if (err && err.code === 'CANCELLED') {
            worker.postMessage({ type: 'cancel' });
            return;
          }
          const e = new Error(err && err.message ? err.message : String(err));
          finish(() => reject(e));
        }
      };

      worker.postMessage({
        type: 'init',
        times: plan.times,
        duration: plan.duration,
        bitrate: encoderSettings.bitrate,
        frameRate: encoderSettings.frameRate,
        width: config.width,
        height: config.height,
        muxerUrl: VideoGenerator.muxerURL(),
        saveHandle: saveHandle || null,
        suggestedName,
      });
    });
  }

  // In-page fallback: identical output, computed on the main thread. Used
  // when the worker is unavailable or dies before streaming begins.
  async _generateViaMainThread(config, plan, saveHandle, encoderSettings, onProgress, onPhase, startedAt) {
    this._checkCancelled();

    const mux = await VideoGenerator.loadMuxer();
    this._checkCancelled();

    const encodeBackground = VideoGenerator.effectiveBackground(config.background);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;

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

    // Font already ensured by generate(). Hoist static canvas state.
    const paint = TimerDisplay.createFramePainter(canvas, {
      background: encodeBackground,
      font: config.font,
      format: config.format,
    });

    // Disk streaming when a handle was supplied (worker unavailable but the
    // user picked a file); otherwise the whole MP4 is buffered in memory.
    let writable = null;
    let target;
    if (saveHandle) {
      writable = await saveHandle.createWritable();
      target = new mux.StreamTarget(writable, { chunked: true });
    } else {
      target = new mux.BufferTarget();
    }

    const output = new mux.Output({
      format: new mux.Mp4OutputFormat(),
      target,
    });
    const source = new mux.CanvasSource(canvas, {
      codec: 'avc',
      // Realtime mode: no B-frames or pipeline delay, so the first frame
      // presents at t=0 instead of after an encoder-delay gap.
      latencyMode: 'realtime',
      quality: new mux.Quality({ bitrate: encoderSettings.bitrate }),
    });
    output.addVideoTrack(
      source,
      encoderSettings.frameRate ? { frameRate: encoderSettings.frameRate } : {}
    );

    let paintMs = 0;
    let encodeMs = 0;
    try {
      try {
        await output.start();
      } catch (err) {
        if (writable) { try { await writable.abort(); } catch (_) { /* best effort */ } }
        throw VideoGenerator.unsupportedError(err && err.message ? err.message : String(err));
      }
      this._checkCancelled();

      phase('Drawing frames…');
      for (let i = 0; i < plan.times.length; i++) {
        this._checkCancelled();
        const tPaint = performance.now();
        paint(plan.times[i] * 1000, config.fps);
        paintMs += performance.now() - tPaint;
        // Awaited: respects writer and encoder backpressure (required by the
        // source contract; fire-and-forget starves hardware encoders).
        const tEncode = performance.now();
        try {
          await source.add(plan.times[i], plan.duration);
        } catch (err) {
          throw VideoGenerator.unsupportedError(err && err.message ? err.message : String(err));
        }
        encodeMs += performance.now() - tEncode;

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
      const tFinalize = performance.now();
      await output.finalize();
      const finalizeMs = performance.now() - tFinalize;
      const timings = {
        frames: plan.times.length,
        paintMs: Math.round(paintMs),
        encodeMs: Math.round(encodeMs),
        finalizeMs: Math.round(finalizeMs),
        totalMs: Math.round(performance.now() - startedAt),
        engine: 'main-thread',
      };
      report(100, { frame: plan.times.length, total: plan.times.length, timeMs: config.finalTimeMs });

      if (saveHandle) {
        // finalize() closed the writable; nothing to download.
        return { streamed: true, suggestedName: VideoGenerator.suggestedName(), timings };
      }
      return {
        blob: new Blob([output.target.buffer], { type: 'video/mp4' }),
        suggestedName: VideoGenerator.suggestedName(),
        timings,
      };
    } catch (err) {
      // Free encoder resources on every failure path (cancel or error),
      // then rethrow.
      try { await output.cancel(); } catch (_) { /* already gone */ }
      if (writable) { try { await writable.abort(); } catch (_) { /* may not support abort */ } }
      throw err;
    }
  }
}
