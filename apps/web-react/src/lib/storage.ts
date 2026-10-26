/**
 * 存储管理器 —— 与官方 @vben-core/shared/cache StorageManager 1:1 对齐
 * 前缀隔离 + { expiry, value } 包装格式
 */

interface StorageItem<T> {
  expiry?: number;
  value: T;
}

class MemoryStorageDriver {
  private store = new Map<string, string>();

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getItem<T>(key: string): Promise<null | T> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.store.delete(key);
      return null;
    }
  }

  async keys(): Promise<string[]> {
    return [...this.store.keys()];
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async setItem(key: string, value: unknown): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }
}

class LocalStorageDriver {
  private storage: Storage;

  constructor(storageType: 'localStorage' | 'sessionStorage' = 'localStorage') {
    this.storage =
      storageType === 'localStorage'
        ? window.localStorage
        : window.sessionStorage;
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getItem<T>(key: string): Promise<null | T> {
    const raw = this.storage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.storage.removeItem(key);
      return null;
    }
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key !== null) result.push(key);
    }
    return result;
  }

  async removeItem(key: string): Promise<void> {
    this.storage.removeItem(key);
  }

  async setItem(key: string, value: unknown): Promise<void> {
    this.storage.setItem(key, JSON.stringify(value));
  }
}

interface IStorageDriver {
  clear(): Promise<void>;
  getItem<T>(key: string): Promise<null | T>;
  keys(): Promise<string[]>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: unknown): Promise<void>;
}

class StorageManager {
  private driver: IStorageDriver;
  private prefix: string;

  constructor({
    driver,
    prefix = '',
  }: { driver?: IStorageDriver; prefix?: string } = {}) {
    this.driver = driver || this.createDefaultDriver();
    this.prefix = prefix;
  }

  async clear(): Promise<void> {
    const allKeys = await this.driver.keys();
    const fullPrefix = this.prefix ? `${this.prefix}-` : '';
    const prefixedKeys = allKeys.filter((key) => key.startsWith(fullPrefix));
    await Promise.all(prefixedKeys.map((key) => this.driver.removeItem(key)));
  }

  async clearExpiredItems(): Promise<void> {
    const allKeys = await this.driver.keys();
    const fullPrefix = this.prefix ? `${this.prefix}-` : '';
    const prefixedKeys = allKeys.filter((key) => key.startsWith(fullPrefix));

    for (const fullKey of prefixedKeys) {
      const raw = await this.driver.getItem<StorageItem<unknown>>(fullKey);
      if (raw && raw.expiry && Date.now() > raw.expiry) {
        await this.driver.removeItem(fullKey);
      }
    }
  }

  async getItem<T>(
    key: string,
    defaultValue: null | T = null,
  ): Promise<null | T> {
    const fullKey = this.getFullKey(key);
    const raw = await this.driver.getItem<StorageItem<T>>(fullKey);

    if (!raw) return defaultValue;

    if (raw.expiry && Date.now() > raw.expiry) {
      await this.driver.removeItem(fullKey);
      return defaultValue;
    }

    return raw.value;
  }

  async keys(): Promise<string[]> {
    const allKeys = await this.driver.keys();
    const fullPrefix = this.prefix ? `${this.prefix}-` : '';
    if (!fullPrefix) return allKeys;
    return allKeys
      .filter((key) => key.startsWith(fullPrefix))
      .map((key) => key.slice(fullPrefix.length));
  }

  async removeItem(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.driver.removeItem(fullKey);
  }

  async setItem(key: string, value: unknown, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const expiry = ttl ? Date.now() + ttl : undefined;
    const item: StorageItem<unknown> = { expiry, value };
    await this.driver.setItem(fullKey, item);
  }

  private createDefaultDriver(): IStorageDriver {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return new LocalStorageDriver();
      }
    } catch (error) {
      console.warn(
        'localStorage is not accessible, falling back to MemoryStorageDriver:',
        error,
      );
    }
    return new MemoryStorageDriver();
  }

  private getFullKey(key: string): string {
    return this.prefix ? `${this.prefix}-${key}` : key;
  }
}

export { LocalStorageDriver, MemoryStorageDriver, StorageManager };
export type { IStorageDriver };
