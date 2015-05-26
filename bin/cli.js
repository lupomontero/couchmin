#! /usr/bin/env node

var fs = require('fs');
var path = require('path');
var url = require('url');
var mkdirp = require('mkdirp');
var minimist = require('minimist');
var which = require('which');
var request = require('request').defaults({ json: true });
var colors = require('colors');
var _ = require('lodash');
var pkg = require('../package.json');
var argv = minimist(process.argv.slice(2));
var cmdName = argv._.shift() || 'help';


var defaults = {
  confdir: path.join(process.env.HOME, '.couchmin'),
  servers: {},
  portRange: [ 5000, 6000 ],
};



function done(err) {
  var code = 0;

  if (err) {
    console.error(err.message.red);
    code = 1;
  }

  process.exit(code);
}


if (argv.v || argv.version) {
  console.log(pkg.version);
  process.exit(0);
}


var settings = _.extend({}, defaults);

if (argv.confdir) {
  settings.confdir = argv.confdir;
}

mkdirp.sync(settings.confdir);


var confFile = path.join(settings.confdir, 'config.json');

if (fs.existsSync(confFile)) {
  _.extend(settings, require(confFile));
}

var cmdPath = path.join(__dirname, '../cmd');
var couchmin = fs.readdirSync(cmdPath).reduce(function (memo, name) {
  var matches = /^([a-z]+)\.js$/.exec(name);
  if (matches) {
    memo[matches[1]] = require(path.join(cmdPath, name));
  }
  return memo;
}, {

  settings: settings,

  saveSettings: function (cb) {
    fs.writeFile(confFile, JSON.stringify(settings, null, 2), cb);
  },

  getUri: function (name) {
    var server = settings.servers[name];

    if (!server) { return; }

    var uri = server.uri;

    if (!uri) {
      var uriFile = path.join(settings.confdir, 'servers', name, 'couch.uri');
      if (!fs.existsSync(uriFile)) { return; }
      uri = ('' + fs.readFileSync(uriFile)).trim();
    }

    var urlObj = url.parse(uri);

    if (server.auth) {
      urlObj.auth = server.auth.user + ':' + server.auth.pass;
    }

    uri = url.format(urlObj);

    // remove trailing slash.
    if (uri[uri.length - 1] === '/') {
      uri = uri.slice(0, -1);
    }

    return uri;
  },

  getPort: function () {
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
  },

  getPidPath: function (name) {
    var server = settings.servers[name];
    return path.join(settings.confdir, 'servers', server.name, 'couch.pid');
  },

  getPid: function (name) {
    var pidFile = this.getPidPath(name);
    if (!fs.existsSync(pidFile)) { return; }
    return ('' + fs.readFileSync(pidFile)).trim();
  },

  replicate: function (ee, name, source, target, cb) {
    ee.emit('replicateStart', name, source, target);
    request.post(this.getUri(name) + '/_replicate', {
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
  },

  syncStats: function (results) {
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
  },

  allDbs: function (uri, cb) {
    request.get(uri + '/_all_dbs', function (err, resp) {
      if (err) { return cb(err); }
      if (resp.statusCode !== 200) {
        err = new Error('Error listing databases on ' + uri);
        err.code = resp.statusCode;
        return cb(err);
      }
      cb(null, resp.body.filter(function (db) {
        return [ '_replicator' ].indexOf(db) === -1;
      }));
    });
  },

  systemCouch: function (cb) {
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

});


var cmd;

try {
  cmd = require('../cmd/' + cmdName);
} catch (ex) {}


if (!cmd || typeof cmd.fn !== 'function') {
  return done(new Error('Unknown command: ' + cmdName));
}

cmd.args = cmd.args || [];

var maxArgs = cmd.args.length;
var minArgs = cmd.args.filter(function (a) { return a.required; }).length;

if (argv._.length > maxArgs) {
  return done(new Error('Too many arguments'));
}

if (argv._.length < minArgs) {
  return done(new Error('Too few arguments'));
}


var args = cmd.args.map(function (arg) {
  return argv._.shift();
});


if (cmd.options && cmd.options.length) {
  args.push(cmd.options.reduce(function (memo, opt) {
    memo[opt.name] = argv[opt.name] || argv[opt.shortcut];
    return memo;
  }, {}));
}


var ee = cmd.fn.apply(couchmin, args.concat(done));


if (!ee || typeof ee.on !== 'function') { return; }


ee.on('pullStart', function (local, remote, dbs) {
  console.log('Found ' + dbs.length + ' database(s) to pull');
});

ee.on('pushStart', function (local, remote, dbs) {
  console.log('Found ' + dbs.length + ' database(s) to push');
});

ee.on('replicateStart', function (local, source, target) {
  console.log('==>'.grey + ' Replicating database from ' + source + ' to ' + target + '...');
});

ee.on('replicateFail', function (local, source, target) {
  console.error('<=='.red + ' Failed to replicate database ' + source + ' to ' + target);
});

ee.on('replicateSuccess', function (local, source, target) {
  console.log('<=='.green + ' Synced database ' + source + ' to ' + target);
});

