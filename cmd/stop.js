'use strict';


const ChildProcess = require('child_process');


exports.fn = function (name, cb) {

  const self = this;
  const settings = self.settings;

  name = name || settings.active;

  if (!name) {
    return cb(new Error('No server selected'));
  }

  const server = settings.servers[name];

  if (!server) {
    return cb(new Error('Server doesn\'t exist'));
  }

  if (server.uri) {
    return cb(new Error('Can not stop a remote server'));
  }

  const pid = self.getPid(name);

  if (!pid) {
    return cb(new Error('Server is not running'));
  }

  self.systemCouch((err, couchdb) => {

    if (err) {
      return cb(err);
    }

    const child = ChildProcess.spawn(couchdb.bin, [
      '-d',
      '-p ' + self.getPidPath(name)
    ]);

    child.on('close', (code) => {

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

