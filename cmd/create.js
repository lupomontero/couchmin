var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');


exports.fn = function (name, options, cb) {

  var couchmin = this;
  var settings = couchmin.settings;

  if (settings.servers[name]) {
    return cb(new Error('Server "' + name + '" already exists'));
  }

  var server = {
    name: name,
    port: couchmin.getPort(),
    createdAt: new Date()
  };

  var serverPath = path.join(settings.confdir, 'servers', server.name);
  var localIni = path.join(serverPath, 'local.ini');
  var localIniContents = [
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

  mkdirp(path.join(serverPath), function (err) {
    if (err) { return cb(err); }
    fs.writeFile(localIni, localIniContents, function (err) {
      if (err) { return cb(err); }
      settings.servers[name] = server;
      couchmin.saveSettings(cb);
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

