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
      var dbUrl = uri + '/' + encodeURIComponent(db);

      request(dbUrl, function (err, resp) {
        if (err) { return cb(err); }
        if (resp.body.compact_running) {
          console.log('Database ' + db + ' is already being compacted.');
          return cb();
        }

        async.auto({
          compact: function (cb) {
            console.log('Compacting database ' + db + '...');
            request({
              method: 'POST',
              url: dbUrl + '/_compact',
              headers: {
                'Content-Type': 'application/json'
              }
            }, function (err, resp) {
              if (err) { return cb(err); }
              if (resp.statusCode > 202) {
                return cb(new Error('Failed to start db compaction for ' + db));
              }
              cb();
            });
          },
          ddocs: function (cb) {
            request({
              method: 'GET',
              url: dbUrl + '/_all_docs',
              qs: {
                startkey: '"_design/"',
                endkey: '"_design0"'
              }
            }, function (err, resp) {
              if (err) { return cb(err); }
              if (resp.statusCode > 202) {
                return cb(new Error('Failed to get design docs for ' + db));
              }
              cb(null, resp.body.rows);
            });
          },
          compactDdocs: [ 'ddocs', function (cb, results) {
            async.each(results.ddocs, function (row, cb) {
              console.log('Compacting design doc ' + row.id + ' in ' + db + '...');
              var ddocName = row.id.split('/')[1];
              request({
                method: 'POST',
                url: dbUrl + '/_compact/' + encodeURIComponent(ddocName),
                headers: {
                  'Content-Type': 'application/json'
                }
              }, function (err, resp) {
                if (err) { return cb(err); }
                if (resp.statusCode > 202) {
                  return cb(new Error('Failed to start view compaction for ' +
                    'view ' + ddocName+ ' in ' + db));
                }
                cb();
              });
            }, cb);
          } ]
        }, cb);
      });
    }, cb);
  });

};

exports.description = 'Compress the disk database file.';
exports.args = [
  { name: 'name' }
];

