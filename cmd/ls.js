var url = require('url');
var async = require('async');
var request = require('request').defaults({ json: true });
var table = require('text-table');


exports.fn = function (cb) {

  var couchmin = this;
  var settings = couchmin.settings;
  var serverNames = Object.keys(settings.servers);

  async.map(serverNames, function (name, cb) {
    var server = settings.servers[name];
    var pid = server.uri ? 'n/a' : couchmin.getPid(name) || '';
    var type = server.uri ? 'remote' : 'local';
    var uri = couchmin.getUri(name);
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

exports.description = 'List CouchDB servers.';

