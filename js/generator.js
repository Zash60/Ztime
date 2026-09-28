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

  // Frame/chunk forecast for the estimate shown before generation starts.
  static estimate({ fps, finalTimeMs }) {
    const times = VideoGenerator.frameTimes(finalTimeMs, fps);
    const chunks = VideoGenerator.chunkRanges(times.length, VideoGenerator.CHUNK_FRAMES).length;
    return { frames: times.length, chunks, seconds: finalTimeMs / 1000 };
  }

  // MP4 (H.264/yuv420p) cannot carry an alpha channel. Resolve "transparent"
  // to an explicit opaque fallback so the export is never silently wrong.
  static effectiveBackground(background) {
    return background === 'transparent' ? '#000000' : background;
  }

  // Frames per ffmpeg encode segment. Keeps MEMFS usage bounded so long
  // videos (e.g. 1h at 60fps) don't exhaust tab memory.
  static get CHUNK_FRAMES() {
    return 600;
  }

  // Partition `totalFrames` frame indices into {start, end} ranges (end exclusive).
  static chunkRanges(totalFrames, chunkSize) {
    const ranges = [];
    for (let start = 0; start < totalFrames; start += chunkSize) {
      ranges.push({ start, end: Math.min(start + chunkSize, totalFrames) });
    }
    return ranges;
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

  async generate(config, onProgress) {
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

    const report = (percent) => {
      if (onProgress) onProgress(Math.min(100, Math.round(percent)));
    };

    // Encode in chunks: write a chunk's PNGs, encode the segment, then free
    // the PNGs immediately so memory stays bounded for any video length.
    const ranges = VideoGenerator.chunkRanges(times.length, VideoGenerator.CHUNK_FRAMES);
    const segmentNames = [];
    // Files currently in MEMFS. Every entry is unlinked exactly once, either
    // when its chunk is freed or in final cleanup (double-unlink throws).
    const pending = new Set();

    try {
      for (let c = 0; c < ranges.length; c++) {
        const { start, end } = ranges[c];

        for (let i = start; i < end; i++) {
          this._checkCancelled();
          TimerDisplay.draw(canvas, times[i], fps, { background: encodeBackground, font, format });

          // Convert canvas to blob and write to ffmpeg
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          const frameName = `chunk_${c}_${String(i - start).padStart(6, '0')}.png`;
          ffmpeg.FS('writeFile', frameName, uint8Array);
          pending.add(frameName);

          // Yield periodically so the UI (incl. progress bar) stays responsive
          if ((i - start) % 30 === 0) await this._yieldToUI();

          report(((c + (i - start + 1) / (end - start)) / ranges.length) * 90);
        }

        // Encode this chunk into a segment
        this._checkCancelled();
        const segName = `segment_${c}.mp4`;
        await ffmpeg.run(
          '-framerate', String(fps),
          '-i', `chunk_${c}_%06d.png`,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-r', String(fps),
          segName
        );

        // Free the chunk's PNGs right away
        for (let i = start; i < end; i++) {
          const frameName = `chunk_${c}_${String(i - start).padStart(6, '0')}.png`;
          ffmpeg.FS('unlink', frameName);
          pending.delete(frameName);
        }
        segmentNames.push(segName);
        pending.add(segName);
        report(((c + 1) / ranges.length) * 90);
      }

      // Concatenate segments into the final video
      this._checkCancelled();
      const listContent = segmentNames.map((n) => `file '${n}'`).join('\n');
      ffmpeg.FS('writeFile', 'concat.txt', new TextEncoder().encode(listContent));
      pending.add('concat.txt');
      await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'output.mp4');
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
