class FFmpegLoader {
  constructor() {
    this.ffmpeg = null;
    this.loading = false;
    this.progress = 0;
  }

  async load() {
    if (this.ffmpeg) return this.ffmpeg;
    if (this.loading) return this._loadingPromise;

    this.loading = true;
    this.progress = 0;

    // Load ffmpeg.wasm from CDN
    const { createFFmpeg, fetchFile } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');

    this.ffmpeg = createFFmpeg({
      log: false,
      progress: ({ ratio }) => {
        this.progress = Math.round(ratio * 100);
      },
    });

    await this.ffmpeg.load();
    this.loading = false;
    return this.ffmpeg;
  }

  isLoaded() {
    return this.ffmpeg !== null;
  }

  getProgress() {
    return this.progress;
  }
}
