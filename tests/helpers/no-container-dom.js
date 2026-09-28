// DOM stub for Node: a page WITHOUT the app containers.
// In a real browser `document` already exists and this file is a no-op;
// there the test is exercised by the real DOMContentLoaded auto-init.
if (typeof document === 'undefined') {
  document = {
    _listeners: {},
    getElementById: () => null,
    addEventListener: function (ev, cb) { this._listeners[ev] = cb; },
  };
}
