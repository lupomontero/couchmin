var fs = require('fs');
var path = require('path');
var url = require('url');
var events = require('events');
var cp = require('child_process');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var which = require('which');
var async = require('async');
var uuid = require('uuid');
var _ = require('lodash');
var request = require('request').defaults({ json: true });
var table = require('text-table');
var pkg = require('./package.json');


var defaults = {
  confdir: path.join(process.env.HOME, '.couchmin'),
  servers: {},
  portRange: [ 5000, 6000 ],
};


function systemCouch(cb) {
  which('couchdb', function (err, bin) {
    if (err) { return cb(err); }

    var couchdb = {
      prefix: path.resolve(path.dirname(bin), '../'),
      bin: bin
    };

    couchdb.ini = path.resolve(couchdb.prefix, './etc/couchdb/default.ini');

    if (bin === '/usr/bin/couchdb') {
      couchdb.prefix = null;
      couchdb.ini = '/etc/couchdb/default.ini';
    }

    cb(null, couchdb);
  });
}


module.exports = function (options) {

  var settings = _.extend({}, defaults, options);
  var fname = path.join(settings.confdir, 'config.json');

  mkdirp.sync(settings.confdir);

  if (fs.existsSync(fname)) {
    _.extend(settings, _.omit(require(fname), [ 'confdir' ]));
  }

  function saveConfig(cb) {
    fs.writeFile(fname, JSON.stringify(settings, null, 2), cb);
  }

  function getPort() {
    var port = settings.portRange[0];
    var max = settings.portRange[1];
    var ports = _.reduce(settings.servers, function (memo, server) {
      if (server.port) { memo[server.port] = 1; }
      return memo;
    }, {});

    while (port < max) {
      if (!ports[port]) { return port; }
      port++;
    }
  }

  function getPidPath(name) {
    var server = settings.servers[name];
    return path.join(settings.confdir, 'servers', server.id, 'couch.pid');
  }

  function getPid(name) {
    var pidFile = getPidPath(name);
    if (!fs.existsSync(pidFile)) { return; }
    return ('' + fs.readFileSync(pidFile)).trim();
  }


  function getUri(name) {
    var server = settings.servers[name];
    var urlObj;

    if (!server) {
      urlObj = url.parse(name);
      if (urlObj.protocol && urlObj.host && urlObj.path) {
        return urlObj.href;
      }
    }

    if (server.uri) { return server.uri; }

    var uriFile = path.join(settings.confdir, 'servers', server.id, 'couch.uri');
    if (!fs.existsSync(uriFile)) { return; }
    var uri = ('' + fs.readFileSync(uriFile)).trim();
    urlObj = url.parse(uri);
    if (server.auth) {
      urlObj.auth = server.auth.user + ':' + server.auth.pass;
    }
    uri = url.format(urlObj);
    // remove trailing slash.
    if (uri[uri.length - 1] === '/') {
      uri = uri.slice(0, -1);
    }
    return uri;
  }


  function allDbs(uri, cb) {
    request.get(uri + '/_all_dbs', function (err, resp) {
      if (err) { return cb(err); }
      if (resp.statusCode !== 200) {
        var err = new Error('Error listing databases on ' + uri);
        err.code = resp.statusCode;
        return cb(err);
      }
      cb(null, resp.body.filter(function (db) {
        return [ '_replicator' ].indexOf(db) === -1;
      }));
    });
  }

  function replicate(ee, name, source, target, cb) {
    ee.emit('replicateStart', name, source, target);
    request.post(getUri(name) + '/_replicate', {
      body: {
        source: source,
        target: target,
        create_target: true
      }
    }, function (err, resp) {
      if (err) { return cb(err); }
      var result = { source: source, target: target, value: resp.body || {} };
      if (resp.statusCode !== 200) {
        result.value.statusCode = resp.statusCode;
        console.log(result);
        ee.emit('replicateFail', name, source, target);
      } else {
        ee.emit('replicateSuccess', name, source, target);
      }
      cb(null, result);
    });
  }

  function syncStats(results) {
    var stats = results.reduce(function (memo, result) {
      if (result.error || (result.value || {}).error) {
        memo.error += 1;
      } else {
        memo.success += 1;
      }
      memo.count += 1;
      return memo;
    }, { success: 0, error: 0, count: 0 });

    if (stats.error) {
      console.log(('Done with errors: ' + stats.error + '/' + stats.count).bold.red);
    } else {
      console.log(('Done without errors: ' + stats.success + '/' + stats.count).bold.green);
    }
  }


  //
  // Public API
  //

  var couchmin = {};


  couchmin.active = function (name, cb) {
    if (arguments.length === 1) {
      cb = name;
      name = null;
    }

    if (!name) {
      console.log(settings.active || 'none');
      return cb();
    }

    if (!settings.servers[name]) {
      return cb(new Error('Server "' + name + '" doesn\'t exists'));
    }

    settings.active = name;
    saveConfig(cb);
  };

  couchmin.active.description = 'Get or set the active CouchDB server.';
  couchmin.active.args = [
    { name: 'name', required: false, description: 'Server name.'  }
  ];


  couchmin.add = function (name, uri, cb) {
    var urlObj = url.parse(uri);
    var authParts = (urlObj.auth || '').split(':');
    var auth;

    if (settings.servers[name]) {
      return cb(new Error('Server "' + name + '" already exists'));
    }

    if (authParts.length === 2) {
      auth = { user: authParts[0], pass: authParts[1] };
    }

    if (['http:', 'https:'].indexOf(urlObj.protocol) === -1 || !urlObj.host || !urlObj.path) {
      return cb(new Error('Invalid URL'));
    }

    // We don't care about query string or auth
    uri = urlObj.protocol + '//' + urlObj.host + urlObj.path;

    // Remove trailing slash.
    if (/\/$/.test(uri)) { uri = uri.slice(0, -1); }

    request(uri, { auth: auth }, function (err, resp) {
      if (err) { return cb(err); }
      if (resp.statusCode !== 200) {
        return cb(new Error('Server responded with ' + resp.statusCode));
      }
      var version = resp.body.version;
      if (!resp.body.couchdb || !version) {
        return cb(new Error('Server doesn\'t seem to be a CouchDB instance'));
      }
      settings.servers[name] = {
        id: uuid(),
        name: name,
        uri: uri,
        auth: auth,
        createdAt: new Date()
      };

      saveConfig(cb);
      console.log('Added remote server ' + name + ' (v' + version + ') at ' + uri);
    });
  };

  couchmin.add.description = 'Add remote CouchDB server.';
  couchmin.add.args = [
    { name: 'name', required: true, description: 'The server name.' },
    { name: 'uri', required: true, description: 'The server\'s URL.' }
  ];


  couchmin.cleanup = function (name, cb) {
    if (arguments.length === 1) {
      cb = name;
      name = settings.active;
    }

    if (!name) {
      return cb(new Error('No server selected'));
    }

    var server = settings.servers[name];

    if (!server) {
      return cb(new Error('Server doesn\'t exist'));
    }

    var uri = getUri(name);

    allDbs(uri, function (err, dbs) {
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
          cb();
        });
      }, cb);
    });
  };

  couchmin.cleanup.description = 'Remove index files no longer required.';
  couchmin.cleanup.args = [
    { name: 'name' }
  ];


  couchmin.compact = function (name, cb) {
    if (arguments.length === 1) {
      cb = name;
      name = settings.active;
    }

    if (!name) {
      return cb(new Error('No server selected'));
    }

    var server = settings.servers[name];

    if (!server) {
      return cb(new Error('Server doesn\'t exist'));
    }

    var uri = getUri(name);

    allDbs(uri, function (err, dbs) {
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

  couchmin.compact.description = 'Compress the disk database file.';
  couchmin.compact.args = [
    { name: 'name' }
  ];


  //
  // Create local CouchDB server.
  //
  couchmin.create = function (name, cb) {
    if (settings.servers[name]) {
      return cb(new Error('Server "' + name + '" already exists'));
    }

    var server = {
      id: uuid(),
      name: name,
      port: getPort(),
      createdAt: new Date()
    };

    var serverPath = path.join(settings.confdir, 'servers', server.id);
    var localIni = path.join(serverPath, 'local.ini');
    var localIniContents = [
      '[couchdb]',
      'database_dir=' + serverPath,
      'view_index_dir=' + serverPath,
      'uri_file=' + serverPath + '/couch.uri',
      '',
      '[httpd]',
      'port=' + server.port,
      '',
      '[log]',
      'file=' + serverPath + '/couch.log'
    ].join('\n')

    var pass = settings.p || settings.pass;
    if (pass) {
      server.auth = { user: 'admin', pass: pass };
      localIniContents += '\n\n[admins]\nadmin = ' + pass;
    }

    mkdirp(path.join(serverPath), function (err) {
      if (err) { return cb(err); }
      fs.writeFile(localIni, localIniContents, function (err) {
        if (err) { return cb(err); }
        settings.servers[name] = server;
        saveConfig(cb);
      });
    });
  };

  couchmin.create.description = 'Create a local CouchDB server.';
  couchmin.create.args = [
    { name: 'name', required: true }
  ];
  couchmin.create.options = [
    {
      name: 'pass',
      shortcut: 'p',
      description: 'If passed an admin user is created with the given password.'
    }
  ];


  couchmin.info = function (cb) {
    var confdir = settings.confdir;
    var diskUsage = ('' + cp.execSync('du -sh ' + confdir)).split('\t')[0];

    systemCouch(function (err, couchdb) {
      if (err) { return cb(err); }
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
  };

  couchmin.info.description = 'Show system info.';
  couchmin.info.args = [];


  couchmin.ls = function (cb) {
    var serverNames = Object.keys(settings.servers);

    async.map(serverNames, function (name, cb) {
      var server = settings.servers[name];
      var pid = server.uri ? 'n/a' : getPid(name) || '';
      var type = server.uri ? 'remote' : 'local';
      var uri = getUri(name);
      var status = '';
      var version = 'unknown';
      var printableUri = '';
      var active = (settings.active === name) ? '*' : '';

      function done() {
        cb(null, [ name, active, type, pid, status, version, printableUri ]);
      }

      if (type === 'local' && (!uri || !pid)) {
        status = 'stopped';
        return done();
      } else if (!uri) {
        return done();
      }

      var urlObj = url.parse(uri);
      printableUri = urlObj.protocol + '//' + urlObj.host + urlObj.path;

      request(uri, function (err, resp) {
        if (err) {
          status = 'down (' + err.code + ')';
        } else if (resp.statusCode !== 200) {
          status = 'down (' + resp.statusCode + ')';
        } else {
          status = 'up';
          version = resp.body.version;
        }
        done();
      });
    }, function (err, results) {
      if (err) { return cb(err); }
      if (settings.q !== true) {
        results.unshift([ 'NAME', 'ACTIVE', 'TYPE', 'PID', 'STATUS', 'VERSION', 'URI' ]);
      }
      console.log(table(results));
    });
  };

  couchmin.ls.description = 'List CouchDB servers.';
  couchmin.ls.args = [];


  //
  // Pull changes in all databases from remote into local.
  //
  couchmin.pull = function (/*name, remote, cb*/) {
    var start = new Date();
    var args = _.toArray(arguments);
    var cb = function () {};

    if (args.length && typeof args[args.length - 1] === 'function') {
      cb = args.pop();
    }

    var remote = args.pop();
    var name = args.shift() || settings.active;

    if (!name) {
      return cb(new Error('Please specify a server to pull into'));
    }

    var remoteUri = getUri(remote);
    var ee = new events.EventEmitter();

    allDbs(remoteUri, function (err, dbs) {
      if (err) { return cb(err); }
      ee.emit('pullStart', name, remote, dbs);
      async.mapLimit(dbs, 2, function (db, cb) {
        replicate(ee, name, remoteUri + '/' + encodeURIComponent(db), db, cb);
      }, function (err, results) {
        if (err) { return cb(err); }
        syncStats(results);
        console.log(('Finished in ' + (Date.now() - start) + 'ms').bold);
      });
    });

    return ee;
  };

  couchmin.pull.description = 'Replicate from remote into local.';
  couchmin.pull.args = [
    { name: 'name' },
    { name: 'remote', required: true }
  ];


  //
  // Replicate from local to remote.
  //
  couchmin.push = function (/*name, remote, cb*/) {
    var start = new Date();
    var args = _.toArray(arguments);
    var cb = function () {};

    if (args.length && typeof args[args.length - 1] === 'function') {
      cb = args.pop();
    }

    var remote = args.pop();
    var name = args.shift() || settings.active;

    if (!name) {
      return cb(new Error('Please specify a server to pull into'));
    }

    var ee = new events.EventEmitter();

    allDbs(getUri(name), function (err, dbs) {
      if (err) { return cb(err); }
      ee.emit('pushStart', name, remote, dbs);
      async.mapLimit(dbs, 2, function (db, cb) {
        replicate(ee, name, db, remote + '/' + encodeURIComponent(db), cb);
      }, function (err, results) {
        if (err) { return cb(err); }
        syncStats(results);
        console.log(('Finished in ' + (Date.now() - start) + 'ms').bold);
      });
    });

    return ee;
  };

  couchmin.push.description = 'Replicate from local to remote.';
  couchmin.push.args = [
    { name: 'name' },
    { name: 'remote', required: true }
  ];


  couchmin.restart = function (name, cb) {
    if (arguments.length === 1) {
      cb = name;
      name = settings.active;
    }

    couchmin.stop(name, function (err) {
      if (err) { return cb(err); }
      couchmin.start(name, cb);
    });
  };

  couchmin.restart.description = 'Restart CouchDB server.';
  couchmin.restart.args = [
    { name: 'name' }
  ];


  couchmin.rm = function (name, cb) {
    if (arguments.length === 1) {
      cb = name;
      name = settings.active;
    }

    if (!name) {
      return cb(new Error('Server name is required'));
    }

    var server = settings.servers[name];

    if (!server) {
      return cb(new Error('Server doesn\'t exist'));
    }

    rimraf(path.join(settings.confdir, 'servers', server.id), function (err) {
      if (err) { return cb(err); }
      delete settings.servers[name];
      if (settings.active === name) {
        delete settings.active;
      }
      saveConfig(cb);
    });
  };

  couchmin.rm.description = 'Permanently delete CouchDB server.';
  couchmin.rm.args = [
    { name: 'name' }
  ];


  couchmin.start = function (name, cb) {
    if (arguments.length === 1) {
      cb = name;
      name = settings.active;
    }

    if (!name) {
      return cb(new Error('Server name is required'));
    }

    var server = settings.servers[name];

    if (!server) {
      return cb(new Error('Server doesn\'t exist'));
    }

    if (server.uri) {
      return cb(new Error('Can not start a remote server'));
    }

    var serverPath = path.join(settings.confdir, 'servers', server.id);

    systemCouch(function (err, couchdb) {
      if (err) { return cb(err); }

      var stdoutFile = path.join(serverPath, 'couch.stdout');
      var stderrFile = path.join(serverPath, 'couch.stderr');

      var args = [
        '-b',
        '-o ' + stdoutFile,
        '-e ' + stderrFile,
        '-p ' + path.join(serverPath, 'couch.pid'),
        '-n',
        '-a ' + couchdb.ini,
        '-a ' + path.join(serverPath, 'local.ini'),
        '-r ' + 5 // respawn background process after SECONDS (defaults to no)
      ];

      var child = cp.spawn(couchdb.bin, args, {
        //stdio: [ 'ignore', process.stdout, process.stderr ],
        detached: true
      });

      child.on('close', function (code) {
        if (code) {
          return cb(new Error('Could not start server'));
        }
        cb();
      });
    });
  };

  couchmin.start.description = 'Start CouchDB server.';
  couchmin.start.args = [
    { name: 'name' }
  ];


  couchmin.stop = function (name, cb) {
    if (arguments.length === 1) {
      cb = name;
      name = settings.active;
    }

    if (!name) {
      return cb(new Error('No server selected'));
    }

    var server = settings.servers[name];

    if (!server) {
      return cb(new Error('Server doesn\'t exist'));
    }

    if (server.uri) {
      return cb(new Error('Can not stop a remote server'));
    }

    var pid = getPid(name);

    if (!pid) {
      return cb(new Error('Server is not running'));
    }

    systemCouch(function (err, couchdb) {
      if (err) { return cb(err); }
      var child = cp.spawn(couchdb.bin, [
        '-d',
        '-p ' + getPidPath(name)
      ]);

      child.on('close', function (code) {
        if (code) {
          return cb(new Error('Could not stop server'));
        }
        cb();
      });
    });
  };

  couchmin.stop.description = 'Stop CouchDB server.';
  couchmin.stop.args = [
    { name: 'name' }
  ];


  couchmin.uri = function (name, cb) {
    if (arguments.length === 1) {
      cb = name;
      name = settings.active;
    }

    var server = settings.servers[name];

    if (!server) {
      return cb(new Error('Server doesn\'t exist'));
    }

    console.log(getUri(name));
    cb();
  };

  couchmin.uri.description = 'Display server URI.';
  couchmin.uri.args = [
    { name: 'name' }
  ];


  return couchmin;

};

