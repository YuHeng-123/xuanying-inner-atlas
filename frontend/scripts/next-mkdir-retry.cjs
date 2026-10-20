const fs = require('node:fs');
const path = require('node:path');

if (process.platform === 'win32') {
  const originalMkdir = fs.mkdir;
  const pendingByPath = new Map();
  const outputRoot = path.resolve(process.cwd()).toLowerCase();

  function isNextOutput(target) {
    if (typeof target !== 'string') return false;
    const relative = path.relative(outputRoot, path.resolve(target)).toLowerCase();
    const firstSegment = relative.split(path.sep)[0];
    return firstSegment === '.next' || firstSegment === '.next-experience';
  }

  fs.mkdir = function (target, options, callback) {
    let mkdirOptions = options;
    let done = callback;
    if (typeof options === 'function') {
      done = options;
      mkdirOptions = undefined;
    }

    if (typeof done !== 'function' || !isNextOutput(target)) {
      return originalMkdir.call(fs, target, mkdirOptions, done);
    }

    const key = path.resolve(target).toLowerCase();
    const previous = pendingByPath.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => new Promise((resolve) => {
      let attempt = 0;
      const run = () => originalMkdir.call(fs, target, mkdirOptions, (error, result) => {
        if (!error) return resolve({ error: null, result });

        if (error.code === 'EEXIST') {
          return fs.stat(target, (statError, stats) => {
            if (!statError && stats.isDirectory()) {
              resolve({ error: null, result: undefined });
            } else {
              resolve({ error, result: undefined });
            }
          });
        }

        if ((error.code === 'EPERM' || error.code === 'ENOENT') && attempt < 8) {
          attempt += 1;
          return setTimeout(run, attempt * 25);
        }

        resolve({ error, result: undefined });
      });

      run();
    }));

    pendingByPath.set(key, current.then(() => {}, () => {}));
    current.then(({ error, result }) => done(error, result));
  };
}
