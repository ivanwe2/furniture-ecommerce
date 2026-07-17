import * as migration_20260717_123454_initial from './20260717_123454_initial';

export const migrations = [
  {
    up: migration_20260717_123454_initial.up,
    down: migration_20260717_123454_initial.down,
    name: '20260717_123454_initial'
  },
];
