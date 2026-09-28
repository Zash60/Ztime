class VideoGenerator {
  constructor(ffmpegLoader) {
    this.ffmpegLoader = ffmpegLoader;
  }

  async generate(config, onProgress) {
    const { fps, finalTimeMs, width, height, background, font, format } = config;

    // Load ffmpeg
    const ffmpeg = await this.ffmpegLoader.load();

    // Calculate total frames
    const totalFrames = Math.ceil((finalTimeMs / 1000) * fps);
    const frameDuration = 1000 / fps;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    // Generate frames
    for (let i = 0; i < totalFrames; i++) {
      const timeMs = i * frameDuration;
      TimerDisplay.draw(canvas, timeMs, fps, { background, font, format });

      // Convert canvas to blob and write to ffmpeg
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const frameName = `frame_${String(i).padStart(6, '0')}.png`;
      ffmpeg.FS('writeFile', frameName, uint8Array);

      // Report progress
      if (onProgress) {
        onProgress(Math.round((i / totalFrames) * 100));
      }
    }

    // Run ffmpeg to encode MP4
    await ffmpeg.run(
      '-framerate', String(fps),
      '-i', 'frame_%06d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      'output.mp4'
    );

    // Read output
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    // Cleanup
    for (let i = 0; i < totalFrames; i++) {
      const frameName = `frame_${String(i).padStart(6, '0')}.png`;
      ffmpeg.FS('unlink', frameName);
    }
    ffmpeg.FS('unlink', 'output.mp4');

    return blob;
  }
}
