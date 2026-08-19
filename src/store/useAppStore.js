import { create } from 'zustand';

export const useAppStore = create((set, get) => {
  // Load initial state from LocalStorage
  const getStored = (key, fallback) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      console.error(`Failed to load ${key} from localStorage`, e);
      return fallback;
    }
  };

  const setStored = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save ${key} to localStorage`, e);
    }
  };

  return {
    // State
    watchlist: getStored('nebulaflix_watchlist', []),
    playbackProgress: getStored('nebulaflix_progress', {}), // id -> { progress, duration, percent, updated, item }
    searchHistory: getStored('nebulaflix_search_history', []),
    preferences: getStored('nebulaflix_preferences', {
      subtitleLang: 'en',
      volume: 0.8,
      autoplayNext: true,
      quality: 'Auto'
    }),

    // Watchlist Actions
    addToWatchlist: (item) => set((state) => {
      const exists = state.watchlist.some((x) => x.id === item.id);
      if (exists) return state;
      const updated = [item, ...state.watchlist];
      setStored('nebulaflix_watchlist', updated);
      return { watchlist: updated };
    }),

    removeFromWatchlist: (itemId) => set((state) => {
      const updated = state.watchlist.filter((x) => x.id !== itemId);
      setStored('nebulaflix_watchlist', updated);
      return { watchlist: updated };
    }),

    // Playback Actions (Continue Watching)
    saveProgress: (id, progress, duration, itemDetails = null) => set((state) => {
      // Calculate percent
      const percent = duration > 0 ? Math.round((progress / duration) * 100) : 0;
      
      // Get existing item or use supplied details, or fallback to known blockbuster database lookup
      let item = itemDetails;
      if (!item && state.playbackProgress[id]) {
        item = state.playbackProgress[id].item;
      }
      
      const newProgress = {
        ...state.playbackProgress,
        [id]: {
          id,
          progress,
          duration,
          percent,
          updated: Date.now(),
          item: item || state.playbackProgress[id]?.item || { id } // keep what we can
        }
      };

      // Filter out items that are near completion (e.g. >95% watched) to keep shelf clean
      if (percent > 95) {
        delete newProgress[id];
      }

      setStored('nebulaflix_progress', newProgress);
      return { playbackProgress: newProgress };
    }),

    clearProgress: (id) => set((state) => {
      const newProgress = { ...state.playbackProgress };
      delete newProgress[id];
      setStored('nebulaflix_progress', newProgress);
      return { playbackProgress: newProgress };
    }),

    // Search History Actions
    addSearchQuery: (query) => set((state) => {
      if (!query || !query.trim()) return state;
      const trimmed = query.trim();
      const filtered = state.searchHistory.filter((x) => x !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 10); // cap at 10 items
      setStored('nebulaflix_search_history', updated);
      return { searchHistory: updated };
    }),

    clearSearchHistory: () => set(() => {
      setStored('nebulaflix_search_history', []);
      return { searchHistory: [] };
    }),

    // Preferences Actions
    setPreference: (key, value) => set((state) => {
      const updated = { ...state.preferences, [key]: value };
      setStored('nebulaflix_preferences', updated);
      return { preferences: updated };
    }),

    // Helper Selectors
    getContinueWatchingList: () => {
      const progress = get().playbackProgress;
      return Object.values(progress)
        .sort((a, b) => b.updated - a.updated)
        .map(p => ({
          ...p.item,
          progress: p.progress,
          duration: p.duration,
          percent: p.percent
        }));
    }
  };
});
export default useAppStore;
