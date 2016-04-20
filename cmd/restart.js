'use strict';


exports.fn = function (name, cb) {

  const self = this;
  const settings = self.settings;

  name = name || settings.active;

  const stop = self.stop.fn.bind(self);
  const start = self.start.fn.bind(self);

  stop(name, (err) => {

    if (err) {
      return cb(err);
    }
    start(name, cb);
  });

};

exports.description = 'Restart CouchDB server.';

exports.args = [
  { name: 'name' }
];

