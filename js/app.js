class App {
  constructor() {
    this.ffmpegLoader = new FFmpegLoader();
    this.videoGenerator = null;
    this.configPanel = null;
    this.preview = null;
  }

  init() {
    const configContainer = document.getElementById('configContainer');
    const previewContainer = document.getElementById('previewContainer');

    // Test/embedding pages include app.js without the app containers —
    // auto-init must no-op instead of throwing.
    if (!configContainer || !previewContainer) return;

    this.configPanel = new ConfigPanel(configContainer);
    this.preview = new Preview(previewContainer);

    this.configPanel.onGenerate(() => this._handleGenerate());
    this.configPanel.onCancel(() => {
      if (this.videoGenerator) this.videoGenerator.cancel();
    });

    // Update preview + estimate when config changes
    configContainer.addEventListener('change', () => {
      if (this.configPanel.validate()) {
        const config = this.configPanel.getConfig();
        this.preview.update(config);
        this.configPanel.hideError();
        this._updateEstimate();
      }
    });

    // Initial preview + estimate
    this.preview.update(this.configPanel.getConfig());
    this._updateEstimate();
  }

  _updateEstimate() {
    if (this.configPanel.validate()) {
      this.configPanel.updateEstimate(
        VideoGenerator.estimate(this.configPanel.getConfig())
      );
    } else {
      this.configPanel.clearEstimate();
    }
  }

  async _handleGenerate() {
    if (!this.configPanel.validate()) return;

    const config = this.configPanel.getConfig();
    this.configPanel.showProgress(0);
    this.configPanel.setGenerating(true);
    this.configPanel.setStatus('Loading video engine…');

    try {
      if (!this.videoGenerator) {
        this.videoGenerator = new VideoGenerator(this.ffmpegLoader);
      }

      const blob = await this.videoGenerator.generate(
        config,
        (percent) => {
          this.configPanel.showProgress(percent);
          this.configPanel.setStatus(
            percent < 90 ? `Drawing frames… ${percent}%` : 'Encoding video…'
          );
        },
        (phase) => this.configPanel.setStatus(phase)
      );

      // Download video
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'speedrun-timer.mp4';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      // Cancel returns to idle silently; real failures keep the config and
      // offer a retry through the error panel (no alert popup).
      if (!error || error.code !== 'CANCELLED') {
        this.configPanel.showError('Error generating video: ' + (error && error.message ? error.message : error));
      }
    } finally {
      this.configPanel.hideProgress();
      this.configPanel.clearStatus();
      this.configPanel.setGenerating(false);
    }
  }
}

// Initialize app when DOM is ready
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
  });
}
