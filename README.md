# couchmin

A command line tool to manage multiple local and remote CouchDB servers.

[![Build Status](https://travis-ci.org/lupomontero/couchmin.svg?branch=master)](https://travis-ci.org/lupomontero/couchmin)
[![Dependency Status](https://david-dm.org/lupomontero/couchmin.svg?style=flat)](https://david-dm.org/lupomontero/couchmin)
[![devDependency Status](https://david-dm.org/lupomontero/couchmin/dev-status.png)](https://david-dm.org/lupomontero/couchmin#info=devDependencies)

## Dependencies

You should have `couchdb`, `node` and `npm` installed and in your `PATH`.

## Install

```
npm install -g couchmin
```

## Usage

```
Usage: couchmin [ options ] <command>

Commands:

active [ <name> ]
  Get or set the active CouchDB server.

add <name> <uri>
  Add remote CouchDB server.

cleanup [ <name> ]
  Remove index files no longer required.

compact [ <name> ]
  Compress the disk database file.

create <name>
  Create a local CouchDB server.

help [ <topic> ]
  Show help.

info
  Show system info.

ls
  List CouchDB servers.

pull [ <name> ] <remote>
  Replicate from remote into local.

push [ <name> ] <remote>
  Replicate from local to remote.

restart [ <name> ]
  Restart CouchDB server.

rm [ <name> ]
  Permanently delete CouchDB server.

start [ <name> ]
  Start CouchDB server.

stop [ <name> ]
  Stop CouchDB server.

uri [ <name> ]
  Display server URI.

Command specific help:

Each command has it's own help text. Use `couchmin help <cmd>`
to display it. For example:

  couchmin help ls

Global Options:

-c, --confdir      Optional path to alternative config dir.
-v, --version      Show version.
--no-color         Disable pretty colours in output.
--disable-updates  Do not check for couchmin updates.
```

