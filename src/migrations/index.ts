import * as migration_20260709_184644_initial from './20260709_184644_initial';

export const migrations = [
  {
    up: migration_20260709_184644_initial.up,
    down: migration_20260709_184644_initial.down,
    name: '20260709_184644_initial'
  },
];
