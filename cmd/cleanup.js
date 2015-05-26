var async = require('async');
var request = require('request').defaults({ json: true });


exports.fn = function (name, cb) {

  var couchmin = this;
  var settings = couchmin.settings;

  name = name || settings.active;

  if (!name) {
    return cb(new Error('No server selected'));
  }

  var server = settings.servers[name];

  if (!server) {
    return cb(new Error('Server doesn\'t exist'));
  }

  var uri = couchmin.getUri(name);

  couchmin.allDbs(uri, function (err, dbs) {
    if (err) { return cb(err); }
    async.each(dbs, function (db, cb) {
      request({
        method: 'POST',
        url: uri + '/' + encodeURIComponent(db) + '/_view_cleanup',
        headers: {
          'Content-Type': 'application/json'
        }
      }, function (err, resp) {
        if (err) { return cb(err); }
        if (resp.statusCode > 202) {
          return cb(new Error('Failed to start view cleanup for ' + db));
        }
        console.log('Started cleanup task for database: ' + db);
        cb();
      });
    }, cb);
  });

};

exports.description = 'Remove index files no longer required.';
exports.args = [
  { name: 'name' }
];

