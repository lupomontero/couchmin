'use strict';


const Async = require('async');
const Request = require('request').defaults({ json: true });


exports.fn = function (name, cb) {

  const self = this;
  const settings = self.settings;

  name = name || settings.active;


  if (!name) {
    return cb(new Error('No server selected'));
  }

  const server = settings.servers[name];

  if (!server) {
    return cb(new Error('Server doesn\'t exist'));
  }

  const uri = self.getUri(name);

  self.allDbs(uri, (err, dbs) => {

    if (err) {
      return cb(err);
    }

    Async.each(dbs, (db, cb) => {

      Request({
        method: 'POST',
        url: uri + '/' + encodeURIComponent(db) + '/_view_cleanup',
        headers: {
          'Content-Type': 'application/json'
        }
      }, (err, resp) => {

        if (err) {
          return cb(err);
        }
        else if (resp.statusCode > 202) {
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

