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

For the hashing function, you need to install `b3sum` and `xxh128sum`. In order
to extract exif information from images and videos, you need to install
`exiftool`.

On a Mac, this can be achieved with `brew install b3sum xxhash exiftool`.

# Usage

<!-- usage -->

```sh-session
$ npm install -g fs-indexer
$ fs-indexer COMMAND
running command...
$ fs-indexer (--version)
fs-indexer/0.0.7 darwin-arm64 node-v20.10.0
$ fs-indexer --help [COMMAND]
USAGE
  $ fs-indexer COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`fs-indexer help [COMMAND]`](#fs-indexer-help-command)

## `fs-indexer help [COMMAND]`

Display help for fs-indexer.

```
USAGE
  $ fs-indexer help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for fs-indexer.
```

_See code:
[@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.21/src/commands/help.ts)_

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
