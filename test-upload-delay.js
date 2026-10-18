// Test helper (not used in production): simulates real Cloudinary network latency so race tests
// exercise the same check-then-await-then-insert path that production hits with live uploads.
const Module = require('module');
const orig = Module._load;
Module._load = function (request, parent, isMain) {
  const m = orig.apply(this, arguments);
  if (request === './cloudinary' && parent && parent.filename.endsWith('server.js')) {
    const u = m.upload;
    m.upload = (...a) => new Promise((res) => setTimeout(() => res(u(...a)), 300));
  }
  return m;
};
