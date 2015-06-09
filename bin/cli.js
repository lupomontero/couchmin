#! /usr/bin/env node

var fs = require('fs');
var path = require('path');
var url = require('url');
var async = require('async');
var mkdirp = require('mkdirp');
var minimist = require('minimist');
var request = require('request').defaults({ json: true });
var colors = require('colors');
var _ = require('lodash');
var pkg = require('../package.json');
var Couchmin = require('../');
var argv = minimist(process.argv.slice(2));
var cmdName = argv._.shift() || 'help';


var defaults = {
  confdir: path.join(process.env.HOME, '.couchmin'),
  updates: {
    enabled: true,
    lastCheck: null
  },
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


function run() {
  var couchmin = Couchmin(settings, confFile);
  var cmd = couchmin[cmdName];

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
}


if (argv.v || argv.version) {
  console.log(pkg.version);
  process.exit(0);
}


//
// Init settings.
//
var settings = _.extend({}, defaults);
if (argv.confdir) { settings.confdir = argv.confdir; }
mkdirp.sync(settings.confdir);
var confFile = path.join(settings.confdir, 'config.json');
if (fs.existsSync(confFile)) {
  _.extend(settings, require(confFile));
}


//
// Check for newer couchmin version if needed.
//
var updatesDisabled = settings.updates.enabled === false || argv['disable-updates'] === true;
var twentyfourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
var outdated = (settings.updates.latest !== pkg.version);
var lastCheck = settings.updates.lastCheck;
if (typeof lastCheck === 'string') {
  lastCheck = new Date(lastCheck);
}

if (updatesDisabled || (!outdated && lastCheck && +lastCheck >= twentyfourHoursAgo)) {
  return run();
}

request('https://registry.npmjs.org/couchmin', function (err, resp) {
  var latest = (((resp || {}).body || {})['dist-tags'] || {}).latest;
  if (!latest) { return run(); } // Fail silently

  settings.updates.latest = latest;
  settings.updates.lastCheck = new Date();
  fs.writeFileSync(confFile, JSON.stringify(settings, null, 2));

  if (latest === pkg.version) { return run(); }

  [
    'A new version of ' + pkg.name + ' (' + latest + ') is available.',
    'You are currently running ' + pkg.version + '.',
    'To upgrade simply run the following command:',
    'npm upgrade -g couchmin'
  ].forEach(function (line) {
    console.error('warning: '.yellow + line);
  });
  process.exit(2);
});

