'use strict';


const Exec = require('./exec');

//
// Start server and wait for it to be ready.
// This will create the server if it doesnt exist.
//
module.exports = function start(name, cb) {

  const r = new RegExp('^' + name);

  const wait = function () {

    setTimeout(() => {

      Exec(['ls', '-f', 'type=local'], (err, stdout) => {

        if (err) {
          return cb(err);
        }

        const line = stdout.trim().split('\n').filter((line) => {

          return r.test(line);
        }).shift();

        if (!line) {
          return wait();
        }

        const cols = line.split(/\s+/);
        const status = cols[2];

        if (status !== 'up') {
          return wait();
        }

        cb();
      });
    }, 1000);
  };


  Exec(['start', name], (err) => {

    if (err && /Server doesn't exist/i.test(err.message)) {
      Exec(['create', name], (err) => {

        if (err) {
          return cb(err);
        }

        Exec(['start', name], (err) => {

          if (err) {
            return cb(err);
          }
          wait();
        });
      });
    }
    else if (err) {
      cb(err);
    }
    else {
      wait();
    }
  });

};

