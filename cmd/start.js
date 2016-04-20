'use strict';


const Path = require('path');
const ChildProcess = require('child_process');


exports.fn = function (name, cb) {

  const self = this;
  const settings = self.settings;

  name = name || settings.active;

  if (!name) {
    return cb(new Error('Server name is required'));
  }

  const server = settings.servers[name];

  if (!server) {
    return cb(new Error('Server doesn\'t exist'));
  }

  if (server.uri) {
    return cb(new Error('Can not start a remote server'));
  }

  const serverPath = Path.join(settings.confdir, 'servers', server.name);

  self.systemCouch((err, couchdb) => {

    if (err) {
      return cb(err);
    }

    const stdoutFile = Path.join(serverPath, 'couch.stdout');
    const stderrFile = Path.join(serverPath, 'couch.stderr');

    const args = [
      '-b',
      '-o ' + stdoutFile,
      '-e ' + stderrFile,
      '-p ' + Path.join(serverPath, 'couch.pid'),
      '-n',
      '-a ' + couchdb.ini,
      '-a ' + Path.join(serverPath, 'local.ini'),
      '-r ' + 5 // respawn background process after SECONDS (defaults to no)
    ];

    const child = ChildProcess.spawn(couchdb.bin, args, {
      stdio: ['ignore', process.stdout, process.stderr]
    });

    child.on('close', (code) => {

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

