# fs-indexer

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/fs-indexer.svg)](https://npmjs.org/package/fs-indexer)
[![Downloads/week](https://img.shields.io/npm/dw/fs-indexer.svg)](https://npmjs.org/package/fs-indexer)
[![License](https://img.shields.io/npm/l/fs-indexer.svg)](https://github.com/hwaterke/fs-indexer/blob/master/package.json)

<!-- toc -->

- [fs-indexer](#fs-indexer)
- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)
- [Development](#development)
<!-- tocstop -->

# Installation

For the hashing function, you need to install `b3sum` and `xxh128sum`.

On a Mac, this can be achieved with `brew install b3sum xxhash`

# Usage

<!-- usage -->

```sh-session
$ npm install -g fs-indexer
$ fs-indexer COMMAND
running command...
$ fs-indexer (--version)
fs-indexer/0.0.3 darwin-x64 node-v17.3.0
$ fs-indexer --help [COMMAND]
USAGE
  $ fs-indexer COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`fs-indexer crawl PATH`](#fs-indexer-crawl-path)
- [`fs-indexer help [COMMAND]`](#fs-indexer-help-command)
- [`fs-indexer info`](#fs-indexer-info)
- [`fs-indexer lookup PATH`](#fs-indexer-lookup-path)
- [`fs-indexer verify PATH`](#fs-indexer-verify-path)

## `fs-indexer crawl PATH`

index the folder provided

```
USAGE
  $ fs-indexer crawl [PATH] [-d <value>] [-a BLAKE3|XXHASH] [-l <value>] [--debug]

FLAGS
  -a, --hashingAlgorithms=<option>...  hashing algorithms to use
                                       <options: BLAKE3|XXHASH>
  -d, --database=<value>               [default: fs-index.db] database file
  -l, --limit=<value>                  stop after indexing n files
  --debug                              enable debug logging

DESCRIPTION
  index the folder provided
```

_See code:
[dist/commands/crawl.ts](https://github.com/hwaterke/fs-indexer/blob/v0.0.3/dist/commands/crawl.ts)_

## `fs-indexer help [COMMAND]`

Display help for fs-indexer.

```
USAGE
  $ fs-indexer help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for fs-indexer.
```

_See code:
[@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

## `fs-indexer info`

prints information about the database

```
USAGE
  $ fs-indexer info [-d <value>] [--duplicates] [--debug]

FLAGS
  -d, --database=<value>  [default: fs-index.db] database file
  --debug                 enable debug logging
  --duplicates

DESCRIPTION
  prints information about the database
```

_See code:
[dist/commands/info.ts](https://github.com/hwaterke/fs-indexer/blob/v0.0.3/dist/commands/info.ts)_

## `fs-indexer lookup PATH`

searches for files within the database

```
USAGE
  $ fs-indexer lookup [PATH] [-d <value>] [--debug]

FLAGS
  -d, --database=<value>  [default: fs-index.db] database file
  --debug                 enable debug logging

DESCRIPTION
  searches for files within the database
```

_See code:
[dist/commands/lookup.ts](https://github.com/hwaterke/fs-indexer/blob/v0.0.3/dist/commands/lookup.ts)_

## `fs-indexer verify PATH`

verifies that the content of the database is in sync with the file system

```
USAGE
  $ fs-indexer verify [PATH] [-d <value>] [-a BLAKE3|XXHASH] [-l <value>] [-p] [--debug]

FLAGS
  -a, --hashingAlgorithms=<option>...  hashing algorithms to use
                                       <options: BLAKE3|XXHASH>
  -d, --database=<value>               [default: fs-index.db] database file
  -l, --limit=<value>                  stop after indexing n files
  -p, --purge                          deletes files that do not exist anymore from the database
  --debug                              enable debug logging

DESCRIPTION
  verifies that the content of the database is in sync with the file system
```

_See code:
[dist/commands/verify.ts](https://github.com/hwaterke/fs-indexer/blob/v0.0.3/dist/commands/verify.ts)_

<!-- commandsstop -->

# Development

## Generating migrations

After making changes to entities, you can generate a migration to capture the
changes with:

```shell
./scripts/generate-migration.sh Name
```

Do not forget to add it to the list of migrations in
`src/database/AppDataSource.ts`
