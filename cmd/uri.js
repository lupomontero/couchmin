exports.fn = function (name, cb) {

  var couchmin = this;
  var settings = couchmin.settings;

  name = name || settings.active;

  var server = settings.servers[name];

  if (!server) {
    return cb(new Error('Server doesn\'t exist'));
  }

  console.log(couchmin.getUri(name));
  cb();

};

exports.description = 'Display server URI.';

exports.args = [
  { name: 'name' }
];

