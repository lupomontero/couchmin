var exec = require('./exec');

//
// Start server and wait for it to be ready.
// This will create the server if it doesnt exist.
//
module.exports = function start(name, cb) {

  var r = new RegExp('^' + name);

  function wait() {
    setTimeout(function () {
      exec([ 'ls', '-f', 'type=local' ], function (err, stdout) {
        if (err) { return cb(err); }
        var line = stdout.trim().split('\n').filter(function (line) {
          return r.test(line);
        }).shift();
        if (!line) { return wait(); }
        var cols = line.split(/\s+/);
        var status = cols[2];
        if (status !== 'up') { return wait(); }
        cb();
      });
    }, 1000);
  }

  exec([ 'start', name ], function (err) {
    if (err && /Server doesn't exist/i.test(err.message)) {
      exec([ 'create', name ], function (err) {
        if (err) { return cb(err); }
        exec([ 'start', name ], function (err) {
          if (err) { return cb(err); }
          wait();
        });
      });
    } else if (err) {
      cb(err);
    } else {
      wait();
    }
  });

};

