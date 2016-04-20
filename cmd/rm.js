'use strict';


const Path = require('path');
const Rimraf = require('rimraf');


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


  const remove = function () {

    Rimraf(Path.join(settings.confdir, 'servers', server.name), (err) => {

      if (err) {
        return cb(err);
      }

      delete settings.servers[name];

      if (settings.active === name) {
        delete settings.active;
      }

      self.saveSettings(cb);
    });
  };


  const pid = self.getPid(name);

  // If not running we can go ahead and remove the server.
  if (!pid) {
    return remove();
  }

  // If running, stop the server first.
  self.stop.fn.call(self, name, (err) => {

    if (err) {
      return cb(err);
    }
    remove();
  });

};

exports.description = 'Permanently delete CouchDB server.';

exports.args = [
  { name: 'name' }
];

