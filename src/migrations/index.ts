import * as migration_20260709_184644_initial from './20260709_184644_initial';
import * as migration_20260717_100952_add_media_image_sizes from './20260717_100952_add_media_image_sizes';

export const migrations = [
  {
    up: migration_20260709_184644_initial.up,
    down: migration_20260709_184644_initial.down,
    name: '20260709_184644_initial',
  },
  {
    up: migration_20260717_100952_add_media_image_sizes.up,
    down: migration_20260717_100952_add_media_image_sizes.down,
    name: '20260717_100952_add_media_image_sizes'
  },
];
