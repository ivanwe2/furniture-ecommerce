import * as migration_20260717_123454_initial from './20260717_123454_initial';
import * as migration_20260721_193900_inventory_stock_qty from './20260721_193900_inventory_stock_qty';

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
];
