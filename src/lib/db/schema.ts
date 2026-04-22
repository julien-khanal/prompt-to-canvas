import Dexie, { type EntityTable } from "dexie";

export interface EncryptedKeyRecord {
  id: string;
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
  updatedAt: number;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  nodes: unknown;
  edges: unknown;
  activeSkillIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ResultCacheRecord {
  hash: string;
  result: unknown;
  createdAt: number;
  bytes: number;
}

export interface MetaRecord {
  id: string;
  value: unknown;
}

export interface SkillRecord {
  id: string;
  name: string;
  description: string;
  body: string;
  enabled: boolean;
  alwaysOn: boolean;
  createdAt: number;
  updatedAt: number;
}

class PromptCanvasDB extends Dexie {
  keys!: EntityTable<EncryptedKeyRecord, "id">;
  workflows!: EntityTable<WorkflowRecord, "id">;
  resultCache!: EntityTable<ResultCacheRecord, "hash">;
  meta!: EntityTable<MetaRecord, "id">;
  skills!: EntityTable<SkillRecord, "id">;

  constructor() {
    super("prompt-canvas");
    this.version(1).stores({
      keys: "&id, updatedAt",
      workflows: "&id, updatedAt",
      resultCache: "&hash, createdAt",
      meta: "&id",
    });
    this.version(2).stores({
      keys: "&id, updatedAt",
      workflows: "&id, updatedAt",
      resultCache: "&hash, createdAt",
      meta: "&id",
      skills: "&id, name, enabled, alwaysOn, updatedAt",
    });
  }
}

let _db: PromptCanvasDB | null = null;
export function db(): PromptCanvasDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!_db) _db = new PromptCanvasDB();
  return _db;
}
