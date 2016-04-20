'use strict';


const ChildProcess = require('child_process');
const Pkg = require('../package.json');


exports.fn = function (cb) {

  const self = this;
  const settings = self.settings;
  const confdir = settings.confdir;

  self.systemCouch((err, couchdb) => {

    if (err) {
      return cb(err);
    }

    ChildProcess.exec('du -sh ' + confdir, (err, stdout) => {

      if (err) {
        return cb(err);
      }

      const diskUsage = ('' + stdout).split('\t')[0];

      console.log('Couchmin'.bold.underline + '\n');
      console.log('Version: ' + Pkg.version);
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

