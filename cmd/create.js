'use strict';


const Fs = require('fs');
const Path = require('path');
const Mkdirp = require('mkdirp');


exports.fn = function (name, options, cb) {

  const self = this;
  const settings = self.settings;

  if (settings.servers[name]) {
    return cb(new Error('Server "' + name + '" already exists'));
  }

  const server = {
    name,
    port: self.getPort(),
    createdAt: new Date()
  };

  const serverPath = Path.join(settings.confdir, 'servers', server.name);
  const localIni = Path.join(serverPath, 'local.ini');
  let localIniContents = [
    '[couchdb]',
    'database_dir=' + serverPath,
    'view_index_dir=' + serverPath,
    'uri_file=' + serverPath + '/couch.uri',
    '',
    '[httpd]',
    'port=' + server.port,
    '',
    '[log]',
    'file=' + serverPath + '/couch.log'
  ].join('\n');

  if (options.pass) {
    server.auth = { user: 'admin', pass: options.pass };
    localIniContents += '\n\n[admins]\nadmin = ' + options.pass;
  }

  Mkdirp(Path.join(serverPath), (err) => {

    if (err) {
      return cb(err);
    }

    Fs.writeFile(localIni, localIniContents, (err) => {

      if (err) {
        return cb(err);
      }

      settings.servers[name] = server;
      self.saveSettings(cb);
    });
  });

};

exports.description = 'Create a local CouchDB server.';

exports.args = [
  { name: 'name', required: true }
];

exports.options = [
  {
    name: 'pass',
    shortcut: 'p',
    description: 'If passed an admin user is created with the given password.'
  }
];
