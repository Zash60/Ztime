// js/encode-worker.js
// Dedicated encode worker for Ztime.
//
// Division of labor: the MAIN thread paints each frame on its canvas — it
// owns the document Font Loading API, and canvas 2D in workers silently
// ignores FontFaces registered there (verified empirically) — then hands an
// ImageBitmap to this worker. This worker owns the H.264 encoder, the MP4
// muxer (vendored Mediabunny) and, optionally, the file stream to disk.
//
// Why a worker: encoder backpressure, muxing and disk writes no longer sit
// on the UI thread, which keeps the timer preview and progress UI at 60fps
// while the video is being produced.
//
// Protocol (messages):
//   in : { type:'init', times:number[], duration:number, bitrate:number,
//          frameRate:number|null, width:number, height:number,
//          muxerUrl:string, saveHandle:FileSystemFileHandle|null,
//          suggestedName:string }
//   out: { type:'ready' }
//   in : { type:'frame', index:number, bitmap:ImageBitmap }      (transfer)
//   out: { type:'frame-done', index:number, encodeMs:number }
//   in : { type:'cancel' }
//   out: { type:'cancelled' }  |  { type:'done', ... }  |  { type:'error', message, phase }
//   out: { type:'progress', percent, frame, total, timeMs }
//
// Nothing in this file may touch document/window.

let state = null;
let phase = 'setup'; // setup → encode → finalize

async function releasePartial() {
  const s = state;
  state = null;
  if (!s) return;
  try { await s.output.cancel(); } catch (_) { /* best effort */ }
  if (s.writable) {
    // Leave no half-written file behind on cancel/error.
    try { await s.writable.abort(); } catch (_) { /* already closed */ }
  }
}

async function handleInit(msg) {
  phase = 'setup';
  self.postMessage({ type: 'phase', text: 'Loading video engine…' });

  const mux = await import(msg.muxerUrl);
  for (const name of ['Output', 'Mp4OutputFormat', 'BufferTarget', 'StreamTarget',
                      'VideoSampleSource', 'Quality']) {
    if (!mux || !mux[name]) {
      throw new Error('Video encoding library failed to load (vendor/mediabunny): missing ' + name);
    }
  }

  let target;
  let writable = null;
  if (msg.saveHandle) {
    // Disk stream: bytes are written as they are encoded instead of being
    // accumulated in memory. Ideal for 4K and long exports.
    writable = await msg.saveHandle.createWritable();
    target = new mux.StreamTarget(writable, { chunked: true });
  } else {
    target = new mux.BufferTarget();
  }

  const output = new mux.Output({
    format: new mux.Mp4OutputFormat(),
    target,
  });
  const source = new mux.VideoSampleSource({
    codec: 'avc',
    latencyMode: 'realtime',
    quality: new mux.Quality({ bitrate: msg.bitrate }),
  });
  // Only integer fps / exact x/1001 fractional rates go into the track;
  // anything else relies on exact per-sample durations.
  output.addVideoTrack(source, msg.frameRate ? { frameRate: msg.frameRate } : {});

  try {
    await output.start();
  } catch (err) {
    if (writable) { try { await writable.abort(); } catch (_) { /* ignore */ } }
    throw err;
  }

  state = {
    mux,
    output,
    source,
    writable,
    streamed: !!msg.saveHandle,
    suggestedName: msg.suggestedName || 'speedrun-timer.mp4',
    times: msg.times,
    duration: msg.duration,
    total: msg.times.length,
    received: 0,
    encodeMs: 0,
    cancelled: false,
  };
  phase = 'encode';
  self.postMessage({ type: 'ready' });
}

async function handleFrame(msg) {
  const s = state;
  if (!s || s.cancelled) {
    if (msg.bitmap && typeof msg.bitmap.close === 'function') {
      try { msg.bitmap.close(); } catch (_) { /* ignore */ }
    }
    return;
  }

  const started = performance.now();
  // VideoSample wraps the bitmap in a VideoFrame (timestamps in seconds,
  // matching the CanvasSource path it mirrors). It MUST be closed once
  // consumed — otherwise Mediabunny reports it as leaked at GC time.
  const sample = new s.mux.VideoSample(msg.bitmap, {
    timestamp: s.times[msg.index],
    duration: s.duration,
  });
  try {
    await s.source.add(sample);
  } finally {
    try { sample.close(); } catch (_) { /* consumed or already closed */ }
  }
  const encodeMs = performance.now() - started;

  s.encodeMs += encodeMs;
  s.received += 1;

  const percent = Math.min(90, Math.round((s.received / s.total) * 90));
  self.postMessage({
    type: 'progress',
    percent,
    frame: s.received,
    total: s.total,
    timeMs: s.times[msg.index] * 1000,
  });
  self.postMessage({ type: 'frame-done', index: msg.index, encodeMs });

  if (s.received >= s.total) {
    phase = 'finalize';
    const finalizeStart = performance.now();
    await s.output.finalize();
    const finalizeMs = performance.now() - finalizeStart;
    const done = {
      type: 'done',
      streamed: s.streamed,
      suggestedName: s.suggestedName,
      timings: { frames: s.total, encodeMs: Math.round(s.encodeMs), finalizeMs: Math.round(finalizeMs) },
    };
    if (s.streamed) {
      // finalize() closes the writable; just report success.
      state = null;
      self.postMessage(done);
    } else {
      const buffer = s.output.target.buffer;
      state = null;
      // Transfer the MP4 back without a copy.
      self.postMessage({ ...done, buffer }, [buffer]);
    }
  }
}

async function handleCancel() {
  await releasePartial();
  self.postMessage({ type: 'cancelled' });
}

self.onmessage = (event) => {
  const msg = event.data || {};
  (async () => {
    try {
      if (msg.type === 'init') return await handleInit(msg);
      if (msg.type === 'frame') return await handleFrame(msg);
      if (msg.type === 'cancel') return await handleCancel();
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      await releasePartial();
      self.postMessage({ type: 'error', message, phase });
    }
  })();
};
