import FeedCache from "Cache/FeedCache";
import { db } from "Db";
import { LNURL } from "LNURL";
import { MetadataCache } from "Cache";

class UserProfileCache extends FeedCache<MetadataCache> {
  constructor() {
    super("UserCache", db.users);
  }

  key(of: MetadataCache): string {
    return of.pubkey;
  }

  async search(q: string): Promise<Array<MetadataCache>> {
    if (db.ready) {
      // on-disk cache will always have more data
      return (
        await db.users
          .where("npub")
          .startsWithIgnoreCase(q)
          .or("name")
          .startsWithIgnoreCase(q)
          .or("display_name")
          .startsWithIgnoreCase(q)
          .or("nip05")
          .startsWithIgnoreCase(q)
          .toArray()
      ).slice(0, 5);
    } else {
      return [...this.cache.values()]
        .filter(user => {
          const profile = user as MetadataCache;
          return (
            profile.name?.includes(q) ||
            profile.npub?.includes(q) ||
            profile.display_name?.includes(q) ||
            profile.nip05?.includes(q)
          );
        })
        .slice(0, 5);
    }
  }

  /**
   * Try to update the profile metadata cache with a new version
   * @param m Profile metadata
   * @returns
   */
  async update(m: MetadataCache) {
    const existing = this.getFromCache(m.pubkey);
    const updateType = (() => {
      if (!existing) {
        return "new_profile";
      }
      if (existing.created < m.created) {
        return "updated_profile";
      }
      if (existing && existing.loaded < m.loaded) {
        return "refresh_profile";
      }
      return "no_change";
    })();
    console.debug(`Updating ${m.pubkey} ${updateType}`, m);
    if (updateType !== "no_change") {
      if (updateType !== "refresh_profile") {
        // fetch zapper key
        const lnurl = m.lud16 || m.lud06;
        if (lnurl) {
          try {
            const svc = new LNURL(lnurl);
            await svc.load();
            m.zapService = svc.zapperPubkey;
          } catch {
            console.warn("Failed to load LNURL for zapper pubkey", lnurl);
          }
        }
      }

      const writeProfile = {
        ...existing,
        ...m,
      };
      this.cache.set(m.pubkey, writeProfile);
      if (db.ready) {
        await db.users.put(writeProfile);
        this.onTable.add(m.pubkey);
      }
      this.notifyChange([m.pubkey]);
      return true;
    }
    return false;
  }

  takeSnapshot(): MetadataCache[] {
    return [];
  }
}

export const UserCache = new UserProfileCache();
