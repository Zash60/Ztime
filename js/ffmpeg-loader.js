class FFmpegLoader {
  constructor() {
    this.ffmpeg = null;
    this.loading = false;
    this.progress = 0;
    this._loadingPromise = null;
  }

  load() {
    if (this.ffmpeg) return Promise.resolve(this.ffmpeg);
    if (this.loading) return this._loadingPromise;

    this.loading = true;
    this.progress = 0;

    this._loadingPromise = this._doLoad().then(
      (ffmpeg) => {
        this.loading = false;
        return ffmpeg;
      },
      (err) => {
        // Never wedge: a failed load resets state so the next call retries.
        this.loading = false;
        this._loadingPromise = null;
        throw err;
      }
    );
    return this._loadingPromise;
  }

  async _doLoad() {
    // Load ffmpeg.wasm from CDN
    const { createFFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');

    this.ffmpeg = createFFmpeg({
      log: false,
      progress: ({ ratio }) => {
        this.progress = Math.round(ratio * 100);
      },
    });

    await this.ffmpeg.load();
    return this.ffmpeg;
  }

  isLoaded() {
    return this.ffmpeg !== null;
  }

  getProgress() {
    return this.progress;
  }
}
