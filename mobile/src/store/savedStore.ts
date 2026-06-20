import { create } from 'zustand';
import { secureStorage } from '../lib/secureStorage';

const STORAGE_KEY = 'hb_saved_listing_ids';

interface SavedState {
  ids: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggle: (id: string) => Promise<boolean>;
  isSaved: (id: string) => boolean;
}

export const useSavedStore = create<SavedState>((set, get) => ({
  ids: [],
  hydrated: false,
  hydrate: async () => {
    const raw = await secureStorage.get(STORAGE_KEY);
    let ids: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) ids = parsed.filter((x) => typeof x === 'string');
      } catch {
        ids = [];
      }
    }
    set({ ids, hydrated: true });
  },
  toggle: async (id) => {
    const wasSaved = get().ids.includes(id);
    const ids = wasSaved ? get().ids.filter((x) => x !== id) : [...get().ids, id];
    await secureStorage.set(STORAGE_KEY, JSON.stringify(ids));
    set({ ids });
    return !wasSaved;
  },
  isSaved: (id) => get().ids.includes(id),
}));
