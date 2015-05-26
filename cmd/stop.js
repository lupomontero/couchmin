var cp = require('child_process');


exports.fn = function (name, cb) {

  var couchmin = this;
  var settings = couchmin.settings;

  name = name || settings.active;

  if (!name) {
    return cb(new Error('No server selected'));
  }

  var server = settings.servers[name];

  if (!server) {
    return cb(new Error('Server doesn\'t exist'));
  }

  if (server.uri) {
    return cb(new Error('Can not stop a remote server'));
  }

  var pid = couchmin.getPid(name);

  if (!pid) {
    return cb(new Error('Server is not running'));
  }

  couchmin.systemCouch(function (err, couchdb) {
    if (err) { return cb(err); }

    var child = cp.spawn(couchdb.bin, [
      '-d',
      '-p ' + couchmin.getPidPath(name)
    ]);

    child.on('close', function (code) {
      if (code) {
        return cb(new Error('Could not stop server'));
      }
      cb();
    });
  });

};

exports.description = 'Stop CouchDB server.';

exports.args = [
  { name: 'name' }
];

