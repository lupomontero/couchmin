#! /usr/bin/env node

var minimist = require('minimist');
var colors = require('colors');
var _ = require('lodash');
var pkg = require('../package.json');
var Couchmin = require('../');
var argv = minimist(process.argv.slice(2));
var cmd = argv._.shift();
var options = _.omit(argv, [ '_' ]);
var couchmin = Couchmin(options);
var fn = couchmin[cmd];


function done(err) {
  var code = 0;

  if (err) {
    console.error(err.message.red);
    code = 1;
  }

  process.exit(code);
}


function globalOptionsUsage() {
  return [
    'Options:'.underline.bold,
    '',
    '-c, --confdir    Optional path to alternative config dir.',
    '-h, --help       Show this help.',
    '-v, --version    Show version.',
    '--no-colors      Disable pretty colours in output.'
  ].join('\n');
}

function commandUsage(cmd, description) {
  var fn = couchmin[cmd];
  var args = fn.args;
  function argsUsage(cmd) {
    var str = '';
    if (args && args.length) {
      args.forEach(function (arg) {
        if (str) { str += ' '; }
        if (arg.required) {
          str += arg.name;
        } else {
          str += '[ ' + arg.name + ' ]';
        }
      });
    }
    if (description) {
      str += '\n  ' + fn.description;
    }
    return str;
  }

  return cmd.bold + ' ' + argsUsage(cmd);
}


if (argv.v || argv.version) {
  console.log(pkg.version);
  process.exit(0);
} else if (!cmd || cmd === 'help' || argv.h || argv.help) {
  var topic = argv._[0];

  if (topic) {
    var topicCommand = couchmin[topic];
    if (!_.isFunction(topicCommand)) {
      return done(new Error('Unknown help topic'));
    }

    console.log(('Usage: ' + pkg.name + ' ' +  commandUsage(topic)).bold, '\n');
    console.log((topicCommand.description || 'No description available') + '\n');
    if (topicCommand.args && topicCommand.args.length) {
      console.log('Arguments'.bold.underline + '\n');
      topicCommand.args.forEach(function (arg) {
        var description = arg.description || 'No description available';
        console.log(arg.name.bold + '\n  ' + description + '\n');
      });
    }
    console.log(globalOptionsUsage());
    process.exit(0);
  }


  console.log(('Usage: ' + pkg.name + ' <command> [ options ]').bold + '\n');
  console.log('Commands:'.bold.underline + '\n');
  Object.keys(couchmin).forEach(function (key) {
    if (!_.isFunction(couchmin[key])) { return; }
    console.log(commandUsage(key, true) + '\n');
  });
  console.log(globalOptionsUsage());
  process.exit(0);
}


if (typeof fn !== 'function') {
  return done(new Error('Unknown command: ' + cmd));
}

var maxArgs = fn.args.length;
var minArgs = fn.args.filter(function (a) { return a.required; }).length;

if (argv._.length > maxArgs) {
  return done(new Error('Too many arguments'));
}

if (argv._.length < minArgs) {
  return done(new Error('Too few arguments'));
}


var ee = fn.apply(couchmin, argv._.concat(done));

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

