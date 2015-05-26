exports.fn = function (name, cb) {

  var couchmin = this;
  var settings = couchmin.settings;

  if (!name) {
    console.log(settings.active || 'none');
    return cb();
  }

  if (!settings.servers[name]) {
    return cb(new Error('Server "' + name + '" doesn\'t exists'));
  }

  settings.active = name;
  couchmin.saveSettings(cb);
};

exports.description = 'Get or set the active CouchDB server.';
exports.args = [
  { name: 'name', required: false, description: 'Server name.'  }
];

