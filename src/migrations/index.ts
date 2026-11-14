import * as migration_20260717_123454_initial from './20260717_123454_initial';
import * as migration_20260721_193900_inventory_stock_qty from './20260721_193900_inventory_stock_qty';
import * as migration_20260805_101500_product_min_price from './20260805_101500_product_min_price';
import * as migration_20261114_131207_payload_3_93 from './20261114_131207_payload_3_93';
import * as migration_20261114_132518_product_page_v2 from './20261114_132518_product_page_v2';

export const migrations = [
  {
    up: migration_20260717_123454_initial.up,
    down: migration_20260717_123454_initial.down,
    name: '20260717_123454_initial',
  },
  {
    up: migration_20260721_193900_inventory_stock_qty.up,
    down: migration_20260721_193900_inventory_stock_qty.down,
    name: '20260721_193900_inventory_stock_qty',
  },
  {
    up: migration_20260805_101500_product_min_price.up,
    down: migration_20260805_101500_product_min_price.down,
    name: '20260805_101500_product_min_price',
  },
  {
    up: migration_20261114_131207_payload_3_93.up,
    down: migration_20261114_131207_payload_3_93.down,
    name: '20261114_131207_payload_3_93',
  },
  {
    up: migration_20261114_132518_product_page_v2.up,
    down: migration_20261114_132518_product_page_v2.down,
    name: '20261114_132518_product_page_v2',
  },
];
