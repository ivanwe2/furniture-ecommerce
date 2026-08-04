import * as migration_20260717_123454_initial from './20260717_123454_initial';
import * as migration_20260721_193900_inventory_stock_qty from './20260721_193900_inventory_stock_qty';
import * as migration_20260805_101500_product_min_price from './20260805_101500_product_min_price';

export const migrations = [
  {
    up: migration_20260717_123454_initial.up,
    down: migration_20260717_123454_initial.down,
    name: '20260717_123454_initial'
  },
  {
    up: migration_20260721_193900_inventory_stock_qty.up,
    down: migration_20260721_193900_inventory_stock_qty.down,
    name: '20260721_193900_inventory_stock_qty'
  },
  {
    up: migration_20260805_101500_product_min_price.up,
    down: migration_20260805_101500_product_min_price.down,
    name: '20260805_101500_product_min_price'
  },
];
