var events = require('events');
var async = require('async');


exports.fn = function (name, remote, cb) {

  var couchmin = this;
  var settings = couchmin.settings;
  var start = new Date();

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

  var remoteUri = couchmin.getUri(remote);
  var ee = new events.EventEmitter();

  couchmin.allDbs(couchmin.getUri(name), function (err, dbs) {
    if (err) { return cb(err); }
    ee.emit('pushStart', name, remote, dbs);
    async.mapLimit(dbs, 2, function (db, cb) {
      couchmin.replicate(ee, name, db, remoteUri + '/' + encodeURIComponent(db), cb);
    }, function (err, results) {
      if (err) { return cb(err); }
      couchmin.syncStats(results);
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

