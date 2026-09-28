// DOM/window stubs for Node. In a real browser both already exist and this
// file is a no-op — there the <script> below loads the real ffmpeg UMD.
if (typeof document === 'undefined') {
  document = {
    head: {
      appendChild: function (el) { if (el.onload) el.onload(); },
    },
    createElement: () => ({}),
    querySelector: () => null,
  };
}
if (typeof window === 'undefined') {
  window = {
    FFmpeg: {
      createFFmpeg: () => ({ load: async () => {}, _fake: true }),
    },
  };
}
