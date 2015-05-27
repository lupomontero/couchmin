var url = require('url');
var async = require('async');
var request = require('request').defaults({ json: true });
var table = require('text-table');
var _ = require('lodash');


exports.fn = function (options, cb) {

  var couchmin = this;
  var settings = couchmin.settings;
  var serverNames = Object.keys(settings.servers);

  var filter = options.filter || [];
  if (typeof filter === 'string') { filter = [ filter ]; }
  function filterTest(name, active, type) {
    return filter.reduce(function (memo, pair) {
      var parts = pair.split('=');
      var key = parts[0];
      var val = parts[1];
      if (key === 'type' && val !== type) { return false; } 
      if (key === 'active' && active !== '*') { return false; }
      if (key === 'name' && !(new RegExp(val)).test(name)) { return false; }
      return memo;
    }, true);
  }

  async.map(serverNames, function (name, cb) {
    var server = settings.servers[name];
    var pid = server.uri ? 'n/a' : couchmin.getPid(name) || '';
    var type = server.uri ? 'remote' : 'local';
    var uri = couchmin.getUri(name);
    var status = '';
    var version = 'unknown';
    var printableUri = '';
    var active = (settings.active === name) ? '*' : '';

    if (!filterTest(name, active, type)) {
      return cb();
    }

    function done() {
      cb(null, [ name, active, type, status, pid, version, printableUri ]);
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
    results = _.compact(results);
    if (options.quiet !== true) {
      results.unshift([ 'NAME', 'ACTIVE', 'TYPE', 'STATUS', 'PID', 'VERSION', 'URI' ]);
      console.log(table(results));
    } else {
      console.log(results.reduce(function (memo, result) {
        if (memo) { memo += '\n'; }
        return memo + result[0];
      }, ''));
    }
  });

};

exports.description = 'List CouchDB servers.';

exports.options = [
  {
    name: 'quiet',
    shortcut: 'q',
    description: 'Only show server names.'
  },
  {
    name: 'filter',
    shortcut: 'f',
    description: [
      'Filter output based on conditions provided.',
      '',
      'Examples:'.bold.underline,
      '',
      'List all servers:',
      '',
      '  couchmin ls',
      '',
      'List only local servers:',
      '',
      '  couchmin ls -f type=local',
      '',
      'List remote servers with names containing "foo":',
      '',
      '  couchmin ls -f name=foo -f type=remote',
    ].join('\n')
  }
];

