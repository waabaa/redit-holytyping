interface CacheItem<T> {
  value: T;
  expiresAt: number | null; // null means no expiration (permanent cache)
}

export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 5 minutes to remove expired items
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Set a cache item with TTL in milliseconds
   * @param key Cache key
   * @param value Value to cache
   * @param ttlMs TTL in milliseconds, null for permanent cache
   */
  set<T>(key: string, value: T, ttlMs: number | null = null): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a cache item, returns undefined if not found or expired
   * @param key Cache key
   * @returns Cached value or undefined
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }

    // Check if item has expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   * @returns true if key exists and is valid
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if item has expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a cache item
   * @param key Cache key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { 
    totalItems: number; 
    expiredItems: number; 
    permanentItems: number; 
    temporaryItems: number;
  } {
    let expiredItems = 0;
    let permanentItems = 0;
    let temporaryItems = 0;
    const now = Date.now();

    this.cache.forEach((item) => {
      if (item.expiresAt === null) {
        permanentItems++;
      } else if (now > item.expiresAt) {
        expiredItems++;
      } else {
        temporaryItems++;
      }
    });

    return {
      totalItems: this.cache.size,
      expiredItems,
      permanentItems,
      temporaryItems
    };
  }

  /**
   * Get or set pattern - useful for caching function results
   * @param key Cache key
   * @param getValue Function to get value if not cached
   * @param ttlMs TTL in milliseconds
   * @returns Cached or newly fetched value
   */
  async getOrSet<T>(
    key: string, 
    getValue: () => Promise<T>, 
    ttlMs: number | null = null
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await getValue();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Remove expired items from cache
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (item.expiresAt && now > item.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${keysToDelete.length} expired items`);
    }
  }

  /**
   * Destroy the cache and cleanup intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Create a singleton cache instance
export const cache = new MemoryCache();

// TTL constants
export const TTL = {
  ONE_MINUTE: 60 * 1000,
  TWO_MINUTES: 2 * 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  TWENTY_FOUR_HOURS: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  PERMANENT: null
} as const;