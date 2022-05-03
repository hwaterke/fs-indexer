#!/usr/bin/env bash

set -ex

MIGRATION_NAME=${1?Please provide a name for the migration in PascalCase}

rm -f migration-generation.sqlite

yarn typeorm-ts-node-commonjs migration:run -d src/database/MigrationGenerationDataSource.ts
yarn typeorm-ts-node-commonjs migration:generate src/database/migrations/"$MIGRATION_NAME"Migration -p -d src/database/MigrationGenerationDataSource.ts
