var path = require('path');
var rimraf = require('rimraf');


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


  function remove() {
    rimraf(path.join(settings.confdir, 'servers', server.name), function (err) {
      if (err) { return cb(err); }

      delete settings.servers[name];

      if (settings.active === name) {
        delete settings.active;
      }

      couchmin.saveSettings(cb);
    });
  }


  var pid = couchmin.getPid(name);

  // If not running we can go ahead and remove the server.
  if (!pid) { return remove(); }

  // If running, stop the server first.
  couchmin.stop.fn.call(couchmin, name, function (err) {
    if (err) { return cb(err); }
    remove();
  });

};

exports.description = 'Permanently delete CouchDB server.';

exports.args = [
  { name: 'name' }
];

