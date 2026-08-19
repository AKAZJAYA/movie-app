import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Filter, X, Film, Monitor, Star, Clock, Sparkles } from 'lucide-react';

// Data & Store
import useAppStore from '../store/useAppStore';
import { searchOmdb, discoverMedia } from '../utils/api';
import MovieCard from '../components/MovieCard';

const GENRE_LIST = [
  'All',
  'Action',
  'Sci-Fi',
  'Adventure',
  'Thriller',
  'Comedy',
  'Drama',
  'Animation',
  'Horror',
  'Fantasy',
  'Crime',
  'Mystery',
  'Romance',
];

const YEAR_LIST = ['All', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2015', '2010', '2000'];

export default function Search() {
  const { searchHistory, addSearchQuery, clearSearchHistory } = useAppStore();

  // Search States
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [activeYear, setActiveYear] = useState('All');
  const [activeRating, setActiveRating] = useState('All');
  const [activeType, setActiveType] = useState('All'); // All, movie, tv
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const isSearchMode = debouncedQuery.length > 0;

  // Fetch results via OMDb API
  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ['omdbDiscovery', isSearchMode, debouncedQuery, activeType, activeGenre, activeYear, activeRating],
    queryFn: async () => {
      if (isSearchMode) {
        return searchOmdb(debouncedQuery, 1, activeType === 'All' ? '' : activeType);
      } else {
        return discoverMedia({
          type: activeType === 'tv' ? 'tv' : 'movie',
          genre: activeGenre,
          year: activeYear,
          minRating: activeRating,
        });
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // Client-side filtering
  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (!isSearchMode) return results;

    return results.filter(item => {
      // 1. Genre filter
      const itemGenres = item.genres || [];
      const matchesGenre = activeGenre === 'All' || itemGenres.some(g => g.toLowerCase().includes(activeGenre.toLowerCase()));

      // 2. Year filter
      const matchesYear = activeYear === 'All' || item.year.startsWith(activeYear);

      // 3. Rating filter
      const itemRating = parseFloat(item.rating || '0.0');
      let matchesRating = true;
      if (activeRating === '8.0+') matchesRating = itemRating >= 8.0;
      else if (activeRating === '7.0+') matchesRating = itemRating >= 7.0;
      else if (activeRating === '6.0+') matchesRating = itemRating >= 6.0;

      // 4. Type filter
      const matchesType = activeType === 'All' || item.type === activeType;

      return matchesGenre && matchesYear && matchesRating && matchesType;
    });
  }, [results, isSearchMode, activeGenre, activeYear, activeRating, activeType]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      addSearchQuery(query);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (sug) => {
    setQuery(sug);
    addSearchQuery(sug);
    setShowSuggestions(false);
  };

  const handleClearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setShowSuggestions(false);
  };

  const handleResetAll = () => {
    setQuery('');
    setDebouncedQuery('');
    setActiveGenre('All');
    setActiveYear('All');
    setActiveRating('All');
    setActiveType('All');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 text-left">
      {/* HUD Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/35 text-neon-cyan text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>OMDb OFFICIAL IMDb DATABASE</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          Discovery Deck
        </h1>
        <p className="text-sm text-gray-400 font-light">
          Search over millions of movies, blockbusters, and TV series in master 1080p and 4K Blu-ray audio & video.
        </p>
      </div>

      {/* 1. Futuristic Input Search Panel */}
      <div className="relative mb-6 max-w-3xl z-30">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <SearchIcon className="absolute left-4 w-5 h-5 text-gray-400" />
          
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search titles, Avengers, Batman, Interstellar, Spider-Man..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl glass-input text-sm sm:text-base font-medium text-white shadow-md focus:shadow-neon-cyan/25 focus:border-neon-cyan"
          />

          {query && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-4 flex items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/5 hover:border-neon-pink hover:bg-neon-pink/15 text-gray-400 hover:text-neon-pink transition-all duration-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Dynamic Search Suggestions Popover */}
        <AnimatePresence>
          {showSuggestions && searchHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 w-full mt-2 rounded-2xl glass-panel-glow border border-white/10 bg-space-900/95 shadow-2xl p-4 overflow-hidden z-40"
            >
              <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-gray-400 mb-2 uppercase select-none">
                <span>Recent Searches</span>
                <button
                  type="button"
                  onClick={clearSearchHistory}
                  className="hover:text-neon-pink transition-colors"
                >
                  Clear History
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {searchHistory.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(sug)}
                    className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-white/5 hover:text-neon-cyan text-left text-xs sm:text-sm text-gray-300 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{sug}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Type Selector and Parameters HUD */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-6 z-20 relative">
        {/* Toggle between All, Movie, TV Series */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-1 rounded-xl">
          {[
            { id: 'All', label: 'All Media', icon: Film },
            { id: 'movie', label: 'Movies', icon: Film },
            { id: 'tv', label: 'Series', icon: Monitor },
          ].map(t => {
            const isActive = activeType === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveType(t.id)}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-md' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Year & Rating dropdown wrappers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 p-1 rounded-xl">
            <span className="text-[10px] text-gray-500 font-bold px-2 uppercase select-none">Year</span>
            <select
              value={activeYear}
              onChange={(e) => setActiveYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-white pr-2 py-1 outline-none border-0 cursor-pointer"
            >
              {YEAR_LIST.map(year => (
                <option key={year} value={year} className="bg-space-900 text-white">{year === 'All' ? 'All Years' : year}</option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 p-1 rounded-xl">
            <span className="text-[10px] text-gray-500 font-bold px-2 uppercase select-none">Rating</span>
            <select
              value={activeRating}
              onChange={(e) => setActiveRating(e.target.value)}
              className="bg-transparent text-xs font-bold text-white pr-2 py-1 outline-none border-0 cursor-pointer"
            >
              <option value="All" className="bg-space-900 text-white">All Ratings</option>
              <option value="8.0+" className="bg-space-900 text-white">8.0+ Highly Rated</option>
              <option value="7.0+" className="bg-space-900 text-white">7.0+ Recommended</option>
              <option value="6.0+" className="bg-space-900 text-white">6.0+ Standard</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Capsule Genre Scroll Bar List */}
      <div className="relative mb-8 z-10 select-none">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {GENRE_LIST.map(genre => {
            const isActive = activeGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`flex-shrink-0 text-xs font-bold px-4 py-1.5 rounded-full border transition-all duration-300 ${
                  isActive
                    ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-sm shadow-neon-cyan/35'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Filter Badges */}
      {(activeGenre !== 'All' || activeYear !== 'All' || activeRating !== 'All' || activeType !== 'All' || query !== '') && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[10px] text-gray-500 font-extrabold uppercase mr-1 select-none">Active Filters:</span>
          {query && (
            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-gray-300 pl-3.5 pr-2 py-1 rounded-full">
              Query: "{query}"
              <X className="w-3 h-3 cursor-pointer text-gray-500 hover:text-white" onClick={handleClearSearch} />
            </span>
          )}
          {activeGenre !== 'All' && (
            <span className="flex items-center gap-1 text-[11px] bg-neon-purple/10 border border-neon-purple/20 text-neon-purple pl-3.5 pr-2 py-1 rounded-full shadow-sm shadow-neon-purple/10">
              {activeGenre}
              <X className="w-3 h-3 cursor-pointer text-gray-500 hover:text-white" onClick={() => setActiveGenre('All')} />
            </span>
          )}
          {activeYear !== 'All' && (
            <span className="flex items-center gap-1 text-[11px] bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan pl-3.5 pr-2 py-1 rounded-full shadow-sm shadow-neon-cyan/10">
              {activeYear}
              <X className="w-3 h-3 cursor-pointer text-gray-500 hover:text-white" onClick={() => setActiveYear('All')} />
            </span>
          )}
          {activeRating !== 'All' && (
            <span className="flex items-center gap-1 text-[11px] bg-neon-pink/10 border border-neon-pink/20 text-neon-pink pl-3.5 pr-2 py-1 rounded-full shadow-sm shadow-neon-pink/10">
              {activeRating}
              <X className="w-3 h-3 cursor-pointer text-gray-500 hover:text-white" onClick={() => setActiveRating('All')} />
            </span>
          )}
          {activeType !== 'All' && (
            <span className="flex items-center gap-1 text-[11px] bg-white/10 border border-white/20 text-white pl-3.5 pr-2 py-1 rounded-full">
              Type: {activeType === 'tv' ? 'Series' : 'Movie'}
              <X className="w-3 h-3 cursor-pointer text-gray-500 hover:text-white" onClick={() => setActiveType('All')} />
            </span>
          )}
          <button
            onClick={handleResetAll}
            className="text-[10px] text-neon-pink font-bold hover:underline ml-2"
          >
            Reset All
          </button>
        </div>
      )}

      {/* 5. Dynamic Grid Results Display */}
      <div>
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-6">
          <span className="text-xs font-bold text-gray-400 uppercase select-none flex items-center gap-2">
            <span>Scan Results [{filteredResults.length}]</span>
            {(isLoading || isFetching) && (
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-ping" />
            )}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-space-800/80 border border-white/5"
              >
                <div className="absolute inset-0 shimmer" />
              </div>
            ))}
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
            {filteredResults.map((item) => (
              <MovieCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center border border-dashed border-white/10 rounded-3xl glass-panel max-w-xl mx-auto mt-8 px-4">
            <Filter className="w-12 h-12 text-gray-600 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-white mb-2">No Matching Coordinates</h3>
            <p className="text-sm text-gray-400 font-light max-w-md mx-auto leading-relaxed">
              No movie or series matched your input filters. Try refining the search query.
            </p>
            <button
              onClick={handleResetAll}
              className="mt-6 py-2.5 px-6 rounded-2xl btn-neon-purple text-xs font-bold text-white"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
