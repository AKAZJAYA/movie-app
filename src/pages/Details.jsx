import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Play, Plus, Check, Clock, Film, Sparkles, Tv, ShieldCheck, Zap } from 'lucide-react';

// Data & Store
import useAppStore from '../store/useAppStore';
import { getMediaDetails, getTVSeasonEpisodes } from '../utils/api';
import MovieCard from '../components/MovieCard';
import TrailerModal from '../components/TrailerModal';

export default function Details() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useAppStore();

  const [activeTab, setActiveTab] = useState('overview'); // overview, episodes, cast, similar
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  // Scroll to top on ID/Type change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, type]);

  // Fetch title metadata
  const { data: mediaItem, isLoading } = useQuery({
    queryKey: ['mediaDetails', type, id],
    queryFn: () => getMediaDetails(type || 'movie', id),
    staleTime: 1000 * 60 * 15,
  });

  // Fetch season episodes if it's a TV show
  const isTV = type === 'tv' || mediaItem?.type === 'tv';
  const { data: seasonEpisodes, isLoading: isEpisodesLoading } = useQuery({
    queryKey: ['tvSeasonEpisodes', id, selectedSeason],
    queryFn: () => getTVSeasonEpisodes(id, selectedSeason),
    enabled: isTV && !!id,
    staleTime: 1000 * 60 * 15,
  });

  const isBookmarked = mediaItem ? watchlist.some((x) => x.id === mediaItem.id) : false;

  const handlePlayNow = () => {
    if (!mediaItem) return;
    const mediaType = isTV ? 'tv' : 'movie';
    let url = `/player/${mediaType}/${mediaItem.id}`;
    if (isTV) {
      url += `?season=${selectedSeason}&episode=1`;
    }
    navigate(url);
  };

  const handleEpisodePlay = (epNum) => {
    navigate(`/player/tv/${id}?season=${selectedSeason}&episode=${epNum}`);
  };

  const handleWatchlistToggle = () => {
    if (!mediaItem) return;
    if (isBookmarked) {
      removeFromWatchlist(mediaItem.id);
    } else {
      addToWatchlist(mediaItem);
    }
  };

  // Compute similar items
  const similarItems = useMemo(() => mediaItem?.similar || [], [mediaItem?.similar]);

  // Dynamic Tabs list based on type
  const tabOptions = useMemo(() => {
    const tabs = [
      { id: 'overview', label: 'Overview' },
    ];
    if (mediaItem?.cast?.length > 0) {
      tabs.push({ id: 'cast', label: 'Cast & Crew' });
    }
    if (isTV) {
      tabs.push({ id: 'episodes', label: 'Episodes' });
    }
    if (similarItems.length > 0) {
      tabs.push({ id: 'similar', label: 'Similar Titles' });
    }
    return tabs;
  }, [mediaItem, isTV, similarItems]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-space-900 flex flex-col items-center justify-center text-center px-4">
        <div className="relative flex items-center justify-center w-16 h-16 mb-4">
          <span className="absolute inset-0 rounded-full border-[3px] border-neon-purple/20 border-t-neon-purple animate-spin" />
          <span className="absolute inset-2 rounded-full border-[3px] border-neon-cyan/20 border-b-neon-cyan animate-[spin_1.5s_linear_infinite_reverse]" />
          <Sparkles className="w-5 h-5 text-neon-cyan animate-pulse" />
        </div>
        <p className="text-sm font-bold tracking-widest text-neon-cyan uppercase animate-pulse">
          FETCHING MOVIE STREAM COORDINATES...
        </p>
      </div>
    );
  }

  if (!mediaItem) {
    return (
      <div className="min-h-screen bg-space-900 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-white mb-2">Media Title Not Found</h2>
        <p className="text-sm text-gray-400 mb-6">Could not acquire coordinates for this title.</p>
        <button
          onClick={() => navigate('/search')}
          className="py-2.5 px-6 rounded-2xl btn-neon-purple text-xs font-bold text-white"
        >
          Return to Discovery Deck
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-space-900 pb-16">
      
      {/* 1. Backdrop Panoramic Backdrop Overlay */}
      <div className="absolute top-0 left-0 w-full h-[50vh] md:h-[65vh] overflow-hidden select-none z-0">
        <img
          src={mediaItem.backdrop_url || mediaItem.poster_url}
          alt={mediaItem.title}
          className="w-full h-full object-cover opacity-35"
        />
        {/* Gradients blending into deep space background */}
        <div className="absolute inset-0 bg-gradient-to-t from-space-900 via-space-900/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-space-900 via-transparent to-space-900" />
      </div>

      {/* 2. Main Details Layout Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-32 flex flex-col lg:flex-row gap-8 lg:gap-12 text-left">
        
        {/* Left Side: Floating High-res Poster */}
        <div className="flex-shrink-0 w-full max-w-[280px] mx-auto lg:mx-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_15px_45px_rgba(0,0,0,0.6)] shadow-neon-purple/5 aspect-[2/3]"
          >
            <img
              src={mediaItem.poster_url}
              alt={mediaItem.title}
              className="w-full h-full object-cover"
            />
            {/* Quick type badge */}
            <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-neon-cyan px-2.5 py-0.5 rounded text-xs font-black uppercase text-neon-cyan select-none shadow">
              {isTV ? 'Series' : 'Movie'}
            </span>
          </motion.div>
        </div>

        {/* Right Side: Primary Info panel */}
        <div className="flex-1 flex flex-col justify-end mt-4 lg:mt-0">
          
          {/* Genre Capsules */}
          <div className="flex flex-wrap gap-2 mb-3">
            {mediaItem.genres?.map((genre, idx) => (
              <span 
                key={idx} 
                className="text-[10px] sm:text-xs bg-neon-purple/10 border border-neon-purple/25 text-neon-cyan px-3.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm shadow-neon-purple/5"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow">
            {mediaItem.title}
          </h1>

          {/* Tagline */}
          {mediaItem.tagline && (
            <p className="text-sm italic text-gray-400 font-light mb-4">
              "{mediaItem.tagline}"
            </p>
          )}

          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium mb-6 text-gray-300">
            {/* Star Rating */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1 rounded-xl">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="text-white font-extrabold">
                {Number.parseFloat(mediaItem.rating) > 0
                  ? Number.parseFloat(mediaItem.rating).toFixed(1)
                  : '8.5'}
              </span>
              <span className="text-xs text-gray-400">/ 10</span>
            </div>

            {/* Year */}
            <span className="bg-white/5 border border-white/5 px-3 py-1 rounded-xl">{mediaItem.year || '2024'}</span>

            {/* Runtime / Seasons */}
            {mediaItem.runtime && (
              <div className="flex items-center gap-1 bg-white/5 border border-white/5 px-3 py-1 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>{mediaItem.runtime}</span>
              </div>
            )}

            {isTV && mediaItem.number_of_seasons && (
              <span className="bg-white/5 border border-white/5 px-3 py-1 rounded-xl text-gray-300">
                {mediaItem.number_of_seasons} {mediaItem.number_of_seasons === 1 ? 'Season' : 'Seasons'}
              </span>
            )}
            
            {/* Playback Badge */}
            <span className="flex items-center gap-1.5 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-black px-3 py-1 rounded-xl text-xs shadow-[0_0_10px_rgba(6,182,212,0.15)]">
              <Zap className="w-3.5 h-3.5 fill-neon-cyan text-neon-cyan" />
              <span>INSTANT HD STREAMING</span>
            </span>
          </div>

          {/* Core Action buttons with Pulse animations */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            {/* PRIMARY: DIRECT PLAY MOVIE / TV SHOW BUTTON */}
            <button
              onClick={handlePlayNow}
              className="flex items-center justify-center gap-2.5 py-4 px-9 rounded-2xl btn-neon-purple text-base sm:text-lg font-black text-white shadow-xl shadow-neon-purple/40 hover:scale-[1.03] active:scale-[0.98] transition-transform duration-200"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>{isTV ? `Watch Season ${selectedSeason} : Ep 1` : 'Watch Movie Now'}</span>
            </button>

            {/* SECONDARY: WATCH TRAILER BUTTON */}
            {mediaItem.trailer_url && (
              <button
                onClick={() => setIsTrailerOpen(true)}
                className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-white/5 border border-neon-cyan/30 hover:border-neon-cyan hover:bg-neon-cyan/10 text-white transition-all duration-300 shadow-md backdrop-blur-md"
              >
                <Film className="w-4 h-4 text-neon-cyan" />
                <span className="text-sm sm:text-base font-bold">Watch Trailer</span>
              </button>
            )}

            {/* WATCHLIST TOGGLE */}
            <button
              onClick={handleWatchlistToggle}
              className={`flex items-center justify-center gap-2 py-4 px-6 rounded-2xl transition-all duration-300 ${
                isBookmarked
                  ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white backdrop-blur-md'
              }`}
            >
              {isBookmarked ? (
                <>
                  <Check className="w-5 h-5" />
                  <span className="text-sm sm:text-base font-bold">In Library</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span className="text-sm sm:text-base font-bold">Add to Library</span>
                </>
              )}
            </button>
          </div>

          {/* Tab Navigation header */}
          <div className="border-b border-white/5 mb-6 flex gap-6 overflow-x-auto no-scrollbar select-none">
            {tabOptions.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative pb-3 text-sm sm:text-base font-extrabold tracking-wider transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.span
                      layoutId="detailsTabUnderline"
                      className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-neon-purple to-neon-cyan shadow-[0_0_8px_#7c3aed]"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab contents wrapper */}
          <div className="min-h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                
                {/* A. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <p className="text-gray-300 text-sm sm:text-base font-light leading-relaxed">
                      {mediaItem.overview}
                    </p>

                    {/* Stream Server Features Overview */}
                    <div className="rounded-2xl border border-neon-purple/20 bg-neon-purple/5 p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-neon-cyan" />
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">
                          Streaming Features & Quality
                        </h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                          <span className="block text-[10px] text-gray-400 font-bold uppercase">Video Quality</span>
                          <span className="font-extrabold text-neon-cyan">1080p Full HD / 4K</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                          <span className="block text-[10px] text-gray-400 font-bold uppercase">Servers</span>
                          <span className="font-extrabold text-white">7 Fast Mirrors</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                          <span className="block text-[10px] text-gray-400 font-bold uppercase">Subtitles</span>
                          <span className="font-extrabold text-white">Multi-Language CC</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                          <span className="block text-[10px] text-gray-400 font-bold uppercase">Progress</span>
                          <span className="font-extrabold text-neon-purple">Auto-Resume Saved</span>
                        </div>
                      </div>
                    </div>

                    {/* Specifications HUD list */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border border-white/5 rounded-2xl p-4 sm:p-6 bg-white/5 backdrop-blur-md glass-panel">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase mb-1">Status</span>
                        <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {mediaItem.status || 'Ready to Stream'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase mb-1">Popularity Index</span>
                        <span className="text-xs sm:text-sm font-bold text-white">{mediaItem.popularity || '985.4'} INDEX</span>
                      </div>
                      <div className="flex flex-col col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase mb-1">Player Engine</span>
                        <span className="text-xs sm:text-sm font-bold text-neon-cyan">VIDAPI & VIDSRC ULTRA</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* B. CAST & CREW TAB */}
                {activeTab === 'cast' && (
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-2">
                    {mediaItem.cast?.map((actor, idx) => (
                      <div key={idx} className="flex-shrink-0 flex flex-col items-center w-20 sm:w-28 text-center select-none group">
                        <div className="relative w-16 sm:w-24 h-16 sm:h-24 rounded-full overflow-hidden p-[1.5px] bg-gradient-to-tr from-neon-purple to-neon-cyan shadow-md group-hover:scale-105 transition-all duration-300">
                          {actor.profile_path ? (
                            <img
                              src={actor.profile_path}
                              alt={actor.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-space-800 flex items-center justify-center text-gray-500 font-bold uppercase text-xl">
                              {actor.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-white mt-2 group-hover:text-neon-cyan transition-colors duration-300 truncate w-full">
                          {actor.name}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium truncate w-full">
                          {actor.character}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* C. EPISODES TAB (TV Series ONLY) */}
                {activeTab === 'episodes' && isTV && (
                  <div className="space-y-6">
                    {/* Season Dropdown */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-gray-400 uppercase select-none">Select Season:</span>
                      <div className="bg-white/5 border border-white/10 p-1 rounded-xl">
                        <select
                          value={selectedSeason}
                          onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                          className="bg-space-900 text-xs font-bold text-white px-3 py-1.5 outline-none border-0 cursor-pointer rounded-lg"
                        >
                          {Array.from({ length: mediaItem.number_of_seasons || 1 }).map((_, idx) => (
                            <option key={idx + 1} value={idx + 1} className="bg-space-900 text-white">
                              Season {idx + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Episode Guide Cards List */}
                    <div className="flex flex-col gap-3">
                      {isEpisodesLoading ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <div key={idx} className="h-20 rounded-2xl bg-space-800/60 shimmer" />
                        ))
                      ) : seasonEpisodes && seasonEpisodes.length > 0 ? (
                        seasonEpisodes.map((ep) => (
                          <div
                            key={ep.episode_number}
                            onClick={() => handleEpisodePlay(ep.episode_number)}
                            className="group/ep flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/5 hover:border-neon-cyan/40 bg-white/5 hover:bg-white/10 backdrop-blur-md glass-panel cursor-pointer transition-all duration-300"
                          >
                            <div className="flex-1 flex gap-4 text-left">
                              {/* Glowing Ep index */}
                              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-space-800 flex items-center justify-center font-black text-neon-cyan border border-white/5 group-hover/ep:border-neon-cyan group-hover/ep:shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all">
                                {ep.episode_number}
                              </div>
                              <div className="flex flex-col justify-center">
                                <h4 className="text-xs sm:text-sm font-extrabold text-white group-hover/ep:text-neon-cyan transition-colors">
                                  {ep.title || `Episode ${ep.episode_number}: ${ep.name || ''}`}
                                </h4>
                                <span className="text-[10px] text-gray-400 font-bold mt-0.5">{ep.runtime || '45 min'}</span>
                                {ep.overview && (
                                  <p className="text-[11px] sm:text-xs text-gray-400 font-light mt-1 line-clamp-2 leading-relaxed">
                                    {ep.overview}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Quick Play Button */}
                            <div className="flex-shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEpisodePlay(ep.episode_number);
                                }}
                                className="flex items-center gap-1.5 py-2 px-4 rounded-xl btn-neon-purple text-xs font-bold text-white shadow-md group-hover/ep:shadow-neon-purple/40"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Play Ep {ep.episode_number}</span>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-gray-400 text-sm">
                          <p className="font-bold">Season {selectedSeason} Episodes Ready</p>
                          <button
                            onClick={() => handleEpisodePlay(1)}
                            className="mt-3 py-2 px-5 rounded-xl btn-neon-purple text-xs font-bold text-white"
                          >
                            Play Season {selectedSeason} Episode 1
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* D. SIMILAR ITEMS TAB */}
                {activeTab === 'similar' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 justify-items-center sm:justify-items-start">
                    {similarItems.map((item) => (
                      <MovieCard key={item.id} item={item} />
                    ))}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* Global Video Lightbox */}
      {mediaItem.trailer_url && (
        <TrailerModal
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          trailerUrl={mediaItem.trailer_url}
          movieTitle={mediaItem.title}
        />
      )}
    </div>
  );
}
