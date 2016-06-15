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
  if (!uri) {
    return cb(new Error('Could not figure out server URL. Is it running?'));
  }

  self.allDbs(uri, (err, dbs) => {

    if (err) {
      return cb(err);
    }

    Async.each(dbs, (db, cb) => {

      const dbUrl = uri + '/' + encodeURIComponent(db);

      Request(dbUrl, (err, resp) => {

        if (err) {
          return cb(err);
        }

        if (resp.body.compact_running) {
          console.log('Database ' + db + ' is already being compacted.');
          return cb();
        }

        Async.auto({
          compact: function (cb) {

            console.log('Compacting database ' + db + '...');
            Request({
              method: 'POST',
              url: dbUrl + '/_compact',
              headers: {
                'Content-Type': 'application/json'
              }
            }, (err, resp) => {

              if (err) {
                return cb(err);
              }
              if (resp.statusCode > 202) {
                return cb(new Error('Failed to start db compaction for ' + db));
              }
              cb();
            });
          },
          ddocs: function (cb) {

            Request({
              method: 'GET',
              url: dbUrl + '/_all_docs',
              qs: {
                startkey: '"_design/"',
                endkey: '"_design0"'
              }
            }, (err, resp) => {

              if (err) {
                return cb(err);
              }
              if (resp.statusCode > 202) {
                return cb(new Error('Failed to get design docs for ' + db));
              }
              cb(null, resp.body.rows);
            });
          },
          compactDdocs: ['ddocs', function (results, cb) {

            Async.each(results.ddocs, (row, cb) => {

              console.log('Compacting design doc ' + row.id + ' in ' + db + '...');
              const ddocName = row.id.split('/')[1];
              Request({
                method: 'POST',
                url: dbUrl + '/_compact/' + encodeURIComponent(ddocName),
                headers: {
                  'Content-Type': 'application/json'
                }
              }, (err, resp) => {

                if (err) {
                  return cb(err);
                }
                if (resp.statusCode > 202) {
                  return cb(new Error('Failed to start view compaction for ' +
                    'view ' + ddocName + ' in ' + db));
                }
                cb();
              });
            }, cb);
          }]
        }, cb);
      });
    }, cb);
  });

};

exports.description = 'Compress the disk database file.';
exports.args = [
  { name: 'name' }
];

