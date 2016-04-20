'use strict';


const Events = require('events');
const Async = require('async');


exports.fn = function (name, remote, cb) {

  const self = this;
  const settings = self.settings;
  const start = new Date();

  if (!remote && settings.active) {
    remote = name;
    name = settings.active;
  }

  if (!settings.servers[name]) {
    return cb(new Error('Server "' + name + '" doesn\'t exists'));
  }

  if (!settings.servers[remote]) {
    return cb(new Error('Server "' + remote + '" doesn\'t exists'));
  }

  const remoteUri = self.getUri(remote);
  const ee = new Events.EventEmitter();

  self.allDbs(self.getUri(name), (err, dbs) => {

    if (err) {
      return cb(err);
    }

    ee.emit('pushStart', name, remote, dbs);
    Async.mapLimit(dbs, 2, (db, cb) => {

      self.replicate(ee, name, db, remoteUri + '/' + encodeURIComponent(db), cb);
    }, (err, results) => {

      if (err) {
        return cb(err);
      }

      self.syncStats(results);
      console.log(('Finished in ' + (Date.now() - start) + 'ms').bold);
    });
  });

  return ee;

};

exports.description = 'Replicate from local to remote.';

exports.args = [
  { name: 'name' },
  { name: 'remote', required: true }
];

