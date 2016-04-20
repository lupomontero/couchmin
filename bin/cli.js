#! /usr/bin/env node
'use strict';

const Fs = require('fs');
const Path = require('path');
const Mkdirp = require('mkdirp');
const Minimist = require('minimist');
const Request = require('request').defaults({ json: true });
const Colors = require('colors');
const _ = require('lodash');
const Pkg = require('../package.json');
const Couchmin = require('../');

const argv = Minimist(process.argv.slice(2));
const cmdName = argv._.shift() || 'help';


const defaults = {
  confdir: Path.join(process.env.HOME, '.couchmin'),
  updates: {
    enabled: true,
    lastCheck: null
  },
  servers: {},
  portRange: [5000, 6000]
};



const done = function (err) {

  let code = 0;

  if (err) {
    console.error(err.message.red);
    code = 1;
  }

  process.exit(code);
};


const run = function () {

  const couchmin = Couchmin(settings, confFile);
  const cmd = couchmin[cmdName];

  if (!cmd || typeof cmd.fn !== 'function') {
    return done(new Error('Unknown command: ' + cmdName));
  }

  cmd.args = cmd.args || [];

  const maxArgs = cmd.args.length;
  const minArgs = cmd.args.filter((a) => {

    return a.required;
  }).length;

  if (argv._.length > maxArgs) {
    return done(new Error('Too many arguments'));
  }

  if (argv._.length < minArgs) {
    return done(new Error('Too few arguments'));
  }


  const args = cmd.args.map((arg) => {

    return argv._.shift();
  });


  if (cmd.options && cmd.options.length) {
    args.push(cmd.options.reduce((memo, opt) => {

      memo[opt.name] = argv[opt.name] || argv[opt.shortcut];
      return memo;
    }, {}));
  }

  const ee = cmd.fn.apply(couchmin, args.concat(done));

  if (!ee || typeof ee.on !== 'function') {
    return;
  }

  ee.on('pullStart', (local, remote, dbs) => {

    console.log('Found ' + dbs.length + ' database(s) to pull');
  });

  ee.on('pushStart', (local, remote, dbs) => {

    console.log('Found ' + dbs.length + ' database(s) to push');
  });

  ee.on('replicateStart', (local, source, target) => {

    console.log('==>'.grey + ' Replicating database from ' + source + ' to ' + target + '...');
  });

  ee.on('replicateFail', (local, source, target) => {

    console.error('<=='.red + ' Failed to replicate database ' + source + ' to ' + target);
  });

  ee.on('replicateSuccess', (local, source, target) => {

    console.log('<=='.green + ' Synced database ' + source + ' to ' + target);
  });
};


if (argv.v || argv.version) {
  console.log(Pkg.version);
  process.exit(0);
}


//
// Init settings.
//
const settings = _.extend({}, defaults);
if (argv.confdir) {
  settings.confdir = argv.confdir;
}

Mkdirp.sync(settings.confdir);
const confFile = Path.join(settings.confdir, 'config.json');
if (Fs.existsSync(confFile)) {
  _.extend(settings, require(confFile));
}


//
// Check for newer couchmin version if needed.
//
const updatesDisabled = settings.updates.enabled === false || argv['disable-updates'] === true;
const twentyfourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
const outdated = (settings.updates.latest !== Pkg.version);
const lastCheck = settings.updates.lastCheck;

if (typeof lastCheck === 'string') {
  lastCheck = new Date(lastCheck);
}

if (updatesDisabled || (!outdated && lastCheck && +lastCheck >= twentyfourHoursAgo)) {
  return run();
}

Request('https://registry.npmjs.org/couchmin', (err, resp) => {

  if (err) {
    return run(); // Fail silently
  }

  const latest = (((resp || {}).body || {})['dist-tags'] || {}).latest;

  if (!latest) {
    return run(); // Fail silently
  }

  settings.updates.latest = latest;
  settings.updates.lastCheck = new Date();
  Fs.writeFileSync(confFile, JSON.stringify(settings, null, 2));

  if (latest === Pkg.version) {
    return run();
  }

  [
    'A new version of ' + Pkg.name + ' (' + latest + ') is available.',
    'You are currently running ' + Pkg.version + '.',
    'To upgrade simply run the following command:',
    'npm upgrade -g couchmin'
  ].forEach((line) => {

    console.error('warning: '.yellow + line);
  });

  process.exit(2);
});

