exports.fn = function (name, cb) {

  var couchmin = this;
  var settings = couchmin.settings;

  name = name || settings.active;

  var stop = couchmin.stop.fn.bind(couchmin);
  var start = couchmin.start.fn.bind(couchmin);

  stop(name, function (err) {
    if (err) { return cb(err); }
    start(name, cb);
  });

};

exports.description = 'Restart CouchDB server.';

exports.args = [
  { name: 'name' }
];

