'use strict';


const Fs = require('fs');
const Path = require('path');
const Url = require('url');
const _ = require('lodash');
const Which = require('which');
const Request = require('request').defaults({ json: true });


module.exports = function (settings, confFile) {

  const cmdPath = Path.join(__dirname, 'cmd');

  return Fs.readdirSync(cmdPath).reduce((memo, name) => {

    const matches = /^([a-z]+)\.js$/.exec(name);
    if (matches) {
      memo[matches[1]] = require(Path.join(cmdPath, name));
    }
    return memo;
  }, {

    settings,

    saveSettings: function (cb) {

      Fs.writeFile(confFile, JSON.stringify(settings, null, 2), cb);
    },

    getUri: function (name) {

      const server = settings.servers[name];

      if (!server) {
        return;
      }

      let uri = server.uri;

      if (!uri) {
        const uriFile = Path.join(settings.confdir, 'servers', name, 'couch.uri');
        if (!Fs.existsSync(uriFile)) {
          return;
        }
        uri = ('' + Fs.readFileSync(uriFile)).trim();
      }

      const urlObj = Url.parse(uri);

      if (server.auth) {
        urlObj.auth = server.auth.user + ':' + server.auth.pass;
      }

      uri = Url.format(urlObj);

      // remove trailing slash.
      if (uri[uri.length - 1] === '/') {
        uri = uri.slice(0, -1);
      }

      return uri;
    },

    getPort: function () {

      let port = settings.portRange[0];
      const max = settings.portRange[1];
      const ports = _.reduce(settings.servers, (memo, server) => {

        if (server.port) {
          memo[server.port] = 1;
        }
        return memo;
      }, {});

      while (port < max) {
        if (!ports[port]) {
          return port;
        }
        port++;
      }
    },

    getPidPath: function (name) {

      const server = settings.servers[name];
      return Path.join(settings.confdir, 'servers', server.name, 'couch.pid');
    },

    getPid: function (name) {

      const pidFile = this.getPidPath(name);
      if (!Fs.existsSync(pidFile)) {
        return;
      }
      return ('' + Fs.readFileSync(pidFile)).trim();
    },

    replicate: function (ee, name, source, target, cb) {

      ee.emit('replicateStart', name, source, target);
      Request.post(this.getUri(name) + '/_replicate', {
        body: {
          source,
          target,
          create_target: true
        }
      }, (err, resp) => {

        if (err) {
          return cb(err);
        }

        const result = {
          source,
          target,
          value: resp.body || {}
        };

        if (resp.statusCode !== 200) {
          result.value.statusCode = resp.statusCode;
          console.log(result);
          ee.emit('replicateFail', name, source, target);
        }
        else {
          ee.emit('replicateSuccess', name, source, target);
        }

        cb(null, result);
      });
    },

    syncStats: function (results) {

      const stats = results.reduce((memo, result) => {

        if (result.error || (result.value || {}).error) {
          memo.error += 1;
        }
        else {
          memo.success += 1;
        }

        memo.count += 1;

        return memo;
      }, { success: 0, error: 0, count: 0 });

      if (stats.error) {
        console.log(('Done with errors: ' + stats.error + '/' + stats.count).bold.red);
      }
      else {
        console.log(('Done without errors: ' + stats.success + '/' + stats.count).bold.green);
      }
    },

    allDbs: function (uri, cb) {

      Request.get(uri + '/_all_dbs', (err, resp) => {

        if (err) {
          return cb(err);
        }
        else if (resp.statusCode !== 200) {
          err = new Error('Error listing databases on ' + uri);
          err.code = resp.statusCode;
          return cb(err);
        }

        cb(null, resp.body.filter((db) => {

          return ['_replicator'].indexOf(db) === -1;
        }));
      });
    },

    systemCouch: function (cb) {

      Which('couchdb', (err, bin) => {

        if (err) {
          return cb(err);
        }

        const couchdb = {
          prefix: Path.resolve(Path.dirname(bin), '../'),
          bin
        };

        couchdb.ini = Path.resolve(couchdb.prefix, './etc/couchdb/default.ini');

        if (bin === '/usr/bin/couchdb') {
          couchdb.prefix = null;
          couchdb.ini = '/etc/couchdb/default.ini';
        }

        cb(null, couchdb);
      });
    }

  });

};
