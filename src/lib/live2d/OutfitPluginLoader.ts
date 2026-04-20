'use client';

export interface OutfitManifest {
  id: string;
  name: string;
  modelUrl: string;
  thumbnailUrl?: string;
  type: 'outfit';
  hide_parts: string[];
  physicsUrl?: string;
  zIndex: number;
}

export interface BaseManifest {
  id: string;
  name: string;
  modelUrl: string;
  thumbnailUrl?: string;
  type: 'base';
}

const DB_NAME = 'Live2DOutfitCache';
const DB_VERSION = 1;
const STORE_NAME = 'outfits';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms (PWA 7-day rule countermeasure)

export class OutfitPluginLoader {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await this.openDB();
    // Clean expired cache on init
    await this.clearExpiredCache();
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };
      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async loadOutfitManifest(manifestUrl: string): Promise<OutfitManifest> {
    // Check cache first
    const cached = await this.getFromCache(manifestUrl);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    // Fetch from URL
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to load outfit manifest: ${response.status}`);
    }
    const data: OutfitManifest = await response.json();

    // Save to cache
    await this.saveToCache(manifestUrl, data);

    return data;
  }

  async loadBaseManifest(manifestUrl: string): Promise<BaseManifest> {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to load base manifest: ${response.status}`);
    }
    return response.json();
  }

  async getAvailableOutfits(): Promise<OutfitManifest[]> {
    // In production, this would fetch from a server API
    // For this demo, return the local manifests
    const manifestUrls = [
      '/live2d/models/outfits/outfit-school.json',
      '/live2d/models/outfits/outfit-casual.json',
      '/live2d/models/outfits/outfit-formal.json',
    ];

    const outfits: OutfitManifest[] = [];
    for (const url of manifestUrls) {
      try {
        const outfit = await this.loadOutfitManifest(url);
        outfits.push(outfit);
      } catch (e) {
        console.warn(`Failed to load outfit manifest: ${url}`, e);
      }
    }

    return outfits;
  }

  private async getFromCache(key: string): Promise<{ data: any; timestamp: number } | null> {
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveToCache(key: string, data: any): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ id: key, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) return;
    const cutoff = Date.now() - CACHE_DURATION;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
