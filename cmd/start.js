var path = require('path');
var cp = require('child_process');


exports.fn = function (name, cb) {

  var couchmin = this;
  var settings = couchmin.settings;

  name = name || settings.active;

  if (!name) {
    return cb(new Error('Server name is required'));
  }

  var server = settings.servers[name];

  if (!server) {
    return cb(new Error('Server doesn\'t exist'));
  }

  if (server.uri) {
    return cb(new Error('Can not start a remote server'));
  }

  var serverPath = path.join(settings.confdir, 'servers', server.name);

  couchmin.systemCouch(function (err, couchdb) {
    if (err) { return cb(err); }

    var stdoutFile = path.join(serverPath, 'couch.stdout');
    var stderrFile = path.join(serverPath, 'couch.stderr');

    var args = [
      '-b',
      '-o ' + stdoutFile,
      '-e ' + stderrFile,
      '-p ' + path.join(serverPath, 'couch.pid'),
      '-n',
      '-a ' + couchdb.ini,
      '-a ' + path.join(serverPath, 'local.ini'),
      '-r ' + 5 // respawn background process after SECONDS (defaults to no)
    ];

    var child = cp.spawn(couchdb.bin, args, {
      stdio: [ 'ignore', process.stdout, process.stderr ]
    });

    child.on('close', function (code) {
      if (code) {
        return cb(new Error('Could not start server'));
      }
      cb();
    });
  });

};

exports.description = 'Start CouchDB server.';

exports.args = [
  { name: 'name' }
];

