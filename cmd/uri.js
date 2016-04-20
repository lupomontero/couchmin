'use strict';


exports.fn = function (name, cb) {

  const self = this;
  const settings = self.settings;

  name = name || settings.active;

  const server = settings.servers[name];

  if (!server) {
    return cb(new Error('Server doesn\'t exist'));
  }

  console.log(self.getUri(name));
  cb();

};

exports.description = 'Display server URI.';

exports.args = [
  { name: 'name' }
];

