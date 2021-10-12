# fs-indexer

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/fs-indexer.svg)](https://npmjs.org/package/fs-indexer)
[![Downloads/week](https://img.shields.io/npm/dw/fs-indexer.svg)](https://npmjs.org/package/fs-indexer)
[![License](https://img.shields.io/npm/l/fs-indexer.svg)](https://github.com/hwaterke/fs-indexer/blob/master/package.json)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

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

- [`fs-indexer hello [FILE]`](#fs-indexer-hello-file)
- [`fs-indexer help [COMMAND]`](#fs-indexer-help-command)

## `fs-indexer hello [FILE]`

describe the command here

```
USAGE
  $ fs-indexer hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ fs-indexer hello
  hello world from ./src/hello.ts!
```

_See code:
[src/commands/hello.ts](https://github.com/hwaterke/fs-indexer/blob/v0.0.0/src/commands/hello.ts)_

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

_See code:
[@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.3/src/commands/help.ts)_

<!-- commandsstop -->
