'use strict';


const Url = require('url');
const Async = require('async');
const Table = require('text-table');
const _ = require('lodash');
const Request = require('request').defaults({
  json: true,
  timeout: 3 * 1000
});


exports.fn = function (options, cb) {

  const self = this;
  const settings = self.settings;
  const serverNames = Object.keys(settings.servers);
  let filter = options.filter || [];

  if (typeof filter === 'string') {
    filter = [filter];
  }

  const filterTest = function (name, active, type) {

    return filter.reduce((memo, pair) => {

      const parts = pair.split('=');
      const key = parts[0];
      const val = parts[1];

      if (key === 'type' && val !== type) {
        return false;
      }
      if (key === 'active' && active !== '*') {
        return false;
      }
      if (key === 'name' && !(new RegExp(val)).test(name)) {
        return false;
      }
      return memo;
    }, true);
  };


  Async.map(serverNames, (name, cb) => {

    const server = settings.servers[name];
    const pid = server.uri ? 'n/a' : self.getPid(name) || '';
    const type = server.uri ? 'remote' : 'local';
    const uri = self.getUri(name);
    const active = (settings.active === name) ? '*' : '';
    let status = '';
    let version = 'unknown';
    let printableUri = '';

    if (!filterTest(name, active, type)) {
      return cb();
    }

    const done = function () {

      cb(null, [name, active, type, status, pid, version, printableUri]);
    };

    if (type === 'local' && (!uri || !pid)) {
      status = 'stopped';
      return done();
    }
    else if (!uri) {
      return done();
    }

    const urlObj = Url.parse(uri);
    printableUri = urlObj.protocol + '//' + urlObj.host + urlObj.path;

    Request(uri, (err, resp) => {

      if (err) {
        status = 'down (' + err.code + ')';
      }
      else if (resp.statusCode !== 200) {
        status = 'down (' + resp.statusCode + ')';
      }
      else {
        status = 'up';
        version = resp.body.version;
      }
      done();
    });
  }, (err, results) => {

    if (err) {
      return cb(err);
    }

    results = _.compact(results);

    if (options.quiet !== true) {
      results.unshift(['NAME', 'ACTIVE', 'TYPE', 'STATUS', 'PID', 'VERSION', 'URI']);
      console.log(Table(results));
    }
    else {
      console.log(results.reduce((memo, result) => {

        if (memo) {
          memo += '\n';
        }
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
      '  couchmin ls -f name=foo -f type=remote'
    ].join('\n')
  }
];

