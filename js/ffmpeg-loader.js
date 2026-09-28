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
    // The ffmpeg.min.js distribution is UMD (no ESM named exports), so a
    // dynamic import() of it can never provide createFFmpeg. Load it as a
    // classic script and use the window.FFmpeg global instead.
    await this._loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');

    const namespace = (typeof window !== 'undefined' && window.FFmpeg) || {};
    if (typeof namespace.createFFmpeg !== 'function') {
      throw new Error('ffmpeg library did not expose createFFmpeg');
    }

    this.ffmpeg = namespace.createFFmpeg({
      log: false,
      progress: ({ ratio }) => {
        this.progress = Math.round(ratio * 100);
      },
    });

    await this.ffmpeg.load();
    return this.ffmpeg;
  }

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const doc = (typeof document !== 'undefined') ? document : null;
      if (!doc) {
        reject(new Error('No document available to load ffmpeg'));
        return;
      }
      if (doc.querySelector && doc.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const el = doc.createElement('script');
      el.onload = () => resolve();
      el.onerror = () => reject(new Error('Failed to load ffmpeg script'));
      el.src = src;
      doc.head.appendChild(el);
    });
  }

  isLoaded() {
    return this.ffmpeg !== null;
  }

  getProgress() {
    return this.progress;
  }
}
