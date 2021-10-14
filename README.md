# fs-indexer

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/fs-indexer.svg)](https://npmjs.org/package/fs-indexer)
[![Downloads/week](https://img.shields.io/npm/dw/fs-indexer.svg)](https://npmjs.org/package/fs-indexer)
[![License](https://img.shields.io/npm/l/fs-indexer.svg)](https://github.com/hwaterke/fs-indexer/blob/master/package.json)

<!-- toc -->
* [fs-indexer](#fs-indexer)
* [Installation](#installation)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Installation

For the hashing function, you need to install `b3sum` and `xxh128sum`.

On a mac, this can be achieved with `brew install b3sum xxhash`

# Usage

<!-- usage -->
```sh-session
$ npm install -g fs-indexer
$ fs-indexer COMMAND
running command...
$ fs-indexer (-v|--version|version)
fs-indexer/0.0.0 darwin-x64 node-v16.7.0
$ fs-indexer --help [COMMAND]
USAGE
  $ fs-indexer COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`fs-indexer crawl PATH`](#fs-indexer-crawl-path)
* [`fs-indexer help [COMMAND]`](#fs-indexer-help-command)
* [`fs-indexer info`](#fs-indexer-info)
* [`fs-indexer verify PATH`](#fs-indexer-verify-path)

## `fs-indexer crawl PATH`

index the folder provided

```
USAGE
  $ fs-indexer crawl PATH

OPTIONS
  -a, --hashingAlgorithms=BLAKE3|XXHASH  hashing algorithms to use
  -d, --database=database                [default: fs-index.db] database file
  -h, --help                             show CLI help
  -l, --limit=limit                      stop after indexing n files
```

_See code: [src/commands/crawl.ts](https://github.com/hwaterke/fs-indexer/blob/v0.0.0/src/commands/crawl.ts)_

## `fs-indexer help [COMMAND]`

display help for fs-indexer

```
USAGE
  $ fs-indexer help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.3/src/commands/help.ts)_

## `fs-indexer info`

prints information about the database

```
USAGE
  $ fs-indexer info

OPTIONS
  -d, --database=database  [default: fs-index.db] database file
  -h, --help               show CLI help
```

_See code: [src/commands/info.ts](https://github.com/hwaterke/fs-indexer/blob/v0.0.0/src/commands/info.ts)_

## `fs-indexer verify PATH`

verifies that the content of the database is in sync with the file system

```
USAGE
  $ fs-indexer verify PATH

OPTIONS
  -a, --hashingAlgorithms=BLAKE3|XXHASH  hashing algorithms to use
  -d, --database=database                [default: fs-index.db] database file
  -h, --help                             show CLI help
  -l, --limit=limit                      stop after indexing n files
  -p, --purge                            deletes files that do not exist anymore from the database
```

_See code: [src/commands/verify.ts](https://github.com/hwaterke/fs-indexer/blob/v0.0.0/src/commands/verify.ts)_
<!-- commandsstop -->
