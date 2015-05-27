var cp = require('child_process');
var pkg = require('../package.json');


exports.fn = function (cb) {

  var couchmin = this;
  var settings = couchmin.settings;
  var confdir = settings.confdir;

  couchmin.systemCouch(function (err, couchdb) {
    if (err) { return cb(err); }
    cp.exec('du -sh ' + confdir, function (err, stdout) {
      if (err) { return cb(err); }

      var diskUsage = ('' + stdout).split('\t')[0];

      console.log('Couchmin'.bold.underline + '\n');
      console.log('Version: ' + pkg.version);
      console.log('Conf dir: ' + confdir);
      console.log('Disk usage: ' + diskUsage);
      console.log('');
      console.log('CouchDB'.bold.underline + '\n');
      console.log('Prefix: ' + couchdb.prefix);
      console.log('Binary: ' + couchdb.bin);
      console.log('Default ini: ' + couchdb.ini);
      cb();
    });
  });

};

exports.description = 'Show system info.';

