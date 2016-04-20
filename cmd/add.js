'use strict';


const Url = require('url');
const Request = require('request').defaults({
  json: true,
  timeout: 10 * 1000
});


exports.fn = function (name, uri, cb) {

  const self = this;
  const settings = self.settings;
  const urlObj = Url.parse(uri);
  const authParts = (urlObj.auth || '').split(':');
  let auth;

  if (settings.servers[name]) {
    return cb(new Error('Server "' + name + '" already exists'));
  }

  if (authParts.length === 2) {
    auth = { user: authParts[0], pass: authParts[1] };
  }

  if (['http:', 'https:'].indexOf(urlObj.protocol) === -1 || !urlObj.host || !urlObj.path) {
    return cb(new Error('Invalid URL'));
  }

  // We don't care about query string or auth
  uri = urlObj.protocol + '//' + urlObj.host + urlObj.path;

  // Remove trailing slash.
  if (/\/$/.test(uri)) {
    uri = uri.slice(0, -1);
  }

  Request(uri, { auth: auth }, (err, resp) => {

    if (err) {
      return cb(err);
    }

    if (resp.statusCode !== 200) {
      return cb(new Error('Server responded with ' + resp.statusCode));
    }

    const version = resp.body.version;
    if (!resp.body.couchdb || !version) {
      return cb(new Error('Server doesn\'t seem to be a CouchDB instance'));
    }

    settings.servers[name] = {
      name: name,
      uri: uri,
      auth: auth,
      createdAt: new Date()
    };

    self.saveSettings(cb);
  });

};

exports.description = 'Add remote CouchDB server.';
exports.args = [
  { name: 'name', required: true, description: 'The server name.' },
  { name: 'uri', required: true, description: 'The server\'s URL.' }
];

