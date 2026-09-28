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

    this.configPanel = new ConfigPanel(configContainer);
    this.preview = new Preview(previewContainer);

    this.configPanel.onGenerate(() => this._handleGenerate());

    // Update preview when config changes
    configContainer.addEventListener('change', () => {
      if (this.configPanel.validate()) {
        this.preview.update(this.configPanel.getConfig());
      }
    });

    // Initial preview
    this.preview.update(this.configPanel.getConfig());
  }

  async _handleGenerate() {
    if (!this.configPanel.validate()) return;

    const config = this.configPanel.getConfig();
    this.configPanel.showProgress(0);

    try {
      if (!this.videoGenerator) {
        this.videoGenerator = new VideoGenerator(this.ffmpegLoader);
      }

      const blob = await this.videoGenerator.generate(config, (percent) => {
        this.configPanel.showProgress(percent);
      });

      // Download video
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'speedrun-timer.mp4';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error generating video: ' + error.message);
    } finally {
      this.configPanel.hideProgress();
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
