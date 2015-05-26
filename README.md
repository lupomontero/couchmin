# couchmin

A command line tool to manage multiple local and remote CouchDB servers.

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

Global Options:

-c, --confdir    Optional path to alternative config dir.
-v, --version    Show version.
--no-colors      Disable pretty colours in output.
```

