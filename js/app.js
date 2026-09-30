class App {
  constructor() {
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

    // Update preview + estimate when config changes. Listen to both
    // 'input' (fires per keystroke/selection — the only timely event for
    // mobile keyboards) and 'change' (fires on blur/commit).
    const refresh = () => {
      if (this.configPanel.validate()) {
        const config = this.configPanel.getConfig();
        this.preview.update(config);
        this.configPanel.hideError();
        this.configPanel.updateFormatExample();
        this._updateEstimate();
      } else {
        this.configPanel.updateFormatExample();
      }
    };
    configContainer.addEventListener('input', refresh);
    configContainer.addEventListener('change', refresh);

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
    this.configPanel.clearSuccess();
    this.configPanel.setStatus('Loading video engine…');

    try {
      if (!this.videoGenerator) {
        this.videoGenerator = new VideoGenerator();
      }

      const blob = await this.videoGenerator.generate(
        config,
        (percent, detail) => {
          this.configPanel.showProgress(percent);
          // Delight: truthful waiting. Show the exact frame and timer value
          // being drawn, so a long render reads as run progress, not a stall.
          // Falls back to the plain percent when detail is unavailable.
          if (percent < 90 && detail && Number.isFinite(detail.timeMs)) {
            let current = null;
            try {
              if (typeof TimerDisplay !== 'undefined' && TimerDisplay && typeof TimerDisplay.formatTime === 'function') {
                current = TimerDisplay.formatTime(detail.timeMs, config.fps, config.format);
              }
            } catch (_) { current = null; }
            const framePart = detail.frame && detail.total ? `Frame ${detail.frame}/${detail.total} · ` : '';
            this.configPanel.setStatus(
              current !== null ? `Drawing ${framePart}${current} — ${percent}%` : `Drawing frames… ${percent}%`
            );
          } else {
            this.configPanel.setStatus(
              percent < 90 ? `Drawing frames… ${percent}%` : 'Encoding video…'
            );
          }
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
      // Delight thesis: crossing the finish line feels earned. The timer
      // stops exactly on the split — "Time!" in speedrun voice, the final
      // time in the timer's own mono, frozen on the monitor.
      let finalLabel = null;
      try {
        if (typeof TimerDisplay !== 'undefined' && TimerDisplay && typeof TimerDisplay.formatTime === 'function') {
          finalLabel = TimerDisplay.formatTime(config.finalTimeMs, config.fps, config.format);
        }
      } catch (_) { finalLabel = null; }
      if (finalLabel !== null) {
        this.configPanel.showSuccess({
          time: finalLabel,
          detail: `Run video saved — speedrun-timer.mp4 (${config.width}×${config.height}, ${config.fps} fps). Generate again to iterate on the split.`,
        });
      } else {
        this.configPanel.showSuccess(
          `Run video saved — speedrun-timer.mp4 (${config.width}×${config.height}, ${config.fps} fps). Generate again to iterate on the split.`
        );
      }
      try {
        if (this.preview && typeof this.preview.update === 'function') {
          this.preview.update(config, config.finalTimeMs);
        }
      } catch (_) { /* preview payoff is optional */ }
    } catch (error) {
      // Cancel returns to idle silently; real failures keep the config and
      // offer a retry through the error panel (no alert popup).
      // Delight: recovery with empathy — name the problem, keep the run setup.
      if (!error || error.code !== 'CANCELLED') {
        const reason = error && error.message ? error.message : String(error);
        this.configPanel.showError(`Run stopped — ${reason} Your settings are kept, try again when ready.`);
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
