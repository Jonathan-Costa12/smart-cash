import { nocodbEnabled } from './nocodb.js';
import * as sqliteStore from './stores/sqliteLancamentosStore.js';
import * as nocodbStore from './stores/nocodbLancamentosStore.js';

const store = nocodbEnabled ? nocodbStore : sqliteStore;

if (nocodbEnabled) {
  console.log('[lancamentosStore] usando NocoDB como fonte de dados dos lançamentos');
} else {
  console.log('[lancamentosStore] usando SQLite local (defina NOCODB_API_TOKEN e NOCODB_TABLE_ID para usar o NocoDB)');
}

export const usingNocoDB = nocodbEnabled;
export const { list, get, create, update, remove } = store;
