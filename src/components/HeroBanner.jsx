import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Check, Volume2, VolumeX, Info, Star, Film } from 'lucide-react';
import useAppStore from '../store/useAppStore';

export default function HeroBanner({ movie, onOpenTrailer }) {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(true);
  const { watchlist, addToWatchlist, removeFromWatchlist } = useAppStore();

  if (!movie) return null;

  const isBookmarked = watchlist.some((x) => x.id === movie.id);

  const handlePlay = () => {
    navigate(`/player/${movie.type || 'movie'}/${movie.id}`);
  };

  const handleInfo = () => {
    navigate(`/details/${movie.type || 'movie'}/${movie.id}`);
  };

  const handleWatchlistToggle = () => {
    if (isBookmarked) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist(movie);
    }
  };

  // Extract YouTube ID from trailer link
  const ytVideoId = movie.trailer_url?.split('/').pop()?.split('?')[0] || 'Way9Dexny3w';

  return (
    <div className="relative w-full h-[70vh] sm:h-[85vh] lg:h-[95vh] overflow-hidden flex items-center bg-black">
      {/* 1. Cinematic Background Video Backdrop (YouTube Embed) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none scale-110 select-none">
        <iframe
          src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${ytVideoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`}
          title={movie.title}
          className="w-full h-full object-cover scale-[1.3] aspect-video"
          allow="autoplay; encrypted-media"
          frameBorder="0"
        />
      </div>

      {/* 2. Panoramic Gradient Vignettes Overlay */}
      <div className="absolute inset-0 bg-hero-vignette z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-space-900 via-space-900/60 to-transparent z-10" />

      {/* 3. Main Hero Content Layout */}
      <div className="relative z-20 max-w-7xl mx-auto w-full px-4 md:px-8 mt-12 md:mt-24 text-left">
        <div className="max-w-2xl">
          {/* Animated Tech Banner */}
          <div className="inline-flex items-center gap-2 bg-neon-purple/20 border border-neon-purple/30 text-neon-cyan px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(124,58,237,0.15)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />
            <span>NEBULA PRIME FEATURED</span>
          </div>

          {/* Glowing Movie Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] leading-tight">
            {movie.title}
          </h1>

          {/* Quick Specs HUD Bar */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-sm font-medium">
            {/* Rating */}
            <div className="flex items-center gap-1.5 bg-black/45 px-2.5 py-1 rounded-lg border border-white/5">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="text-white font-extrabold">
                {Number.parseFloat(movie.rating) > 0 ? movie.rating : '8.5'}
              </span>
            </div>
            
            {/* Year */}
            <span className="text-gray-300 font-bold bg-black/45 px-2.5 py-1 rounded-lg border border-white/5">
              {movie.year || '2024'}
            </span>

            {/* Runtime */}
            {movie.runtime && (
              <span className="text-gray-300 font-bold bg-black/45 px-2.5 py-1 rounded-lg border border-white/5">
                {movie.runtime}
              </span>
            )}

            {/* Type badge */}
            <span className="uppercase text-[10px] text-neon-cyan font-black border border-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded shadow-sm">
              {movie.type === 'tv' ? 'Series' : 'Movie'}
            </span>
          </div>

          {/* Synopsis */}
          <p className="text-sm sm:text-base text-gray-300 line-clamp-3 sm:line-clamp-4 mb-6 sm:mb-8 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] font-light">
            {movie.overview}
          </p>

          {/* Interactive Play & Actions Shelf */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Direct Play Movie Button */}
            <button
              onClick={handlePlay}
              className="flex items-center justify-center gap-2.5 py-3.5 px-7 sm:px-9 rounded-2xl btn-neon-purple text-sm sm:text-base font-black text-white shadow-xl shadow-neon-purple/40 hover:scale-[1.03] active:scale-[0.98] transition-transform duration-200"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>{movie.type === 'tv' ? 'Watch Series' : 'Watch Movie'}</span>
            </button>

            {/* Trailer Preview Button */}
            {onOpenTrailer && (
              <button
                onClick={onOpenTrailer}
                className="flex items-center justify-center gap-2 py-3.5 px-5 sm:px-6 rounded-2xl bg-white/10 border border-neon-cyan/30 hover:border-neon-cyan hover:bg-neon-cyan/15 text-white backdrop-blur-md transition-all duration-300 shadow-md"
              >
                <Film className="w-4 h-4 text-neon-cyan" />
                <span className="text-sm sm:text-base font-bold">Trailer</span>
              </button>
            )}

            {/* Watchlist Toggle */}
            <button
              onClick={handleWatchlistToggle}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 sm:px-5 rounded-2xl transition-all duration-300 ${
                isBookmarked
                  ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white backdrop-blur-md'
              }`}
            >
              {isBookmarked ? (
                <>
                  <Check className="w-4 sm:w-5 h-4 sm:h-5" />
                  <span className="text-sm sm:text-base font-bold">In Library</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                  <span className="text-sm sm:text-base font-bold">Watchlist</span>
                </>
              )}
            </button>

            {/* Info / Spec Page */}
            <button
              onClick={handleInfo}
              className="flex items-center justify-center gap-2 py-3.5 px-4 sm:px-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white backdrop-blur-md transition-all duration-300"
            >
              <Info className="w-4 sm:w-5 h-4 sm:h-5" />
              <span className="text-sm sm:text-base font-bold">Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Controls HUD (Bottom-right volume overlay) */}
      <div className="absolute right-4 md:right-8 bottom-8 z-30 flex items-center gap-4">
        {/* Toggle Sound Indicator */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex items-center justify-center w-12 h-12 rounded-full glass-panel bg-space-900/60 border border-white/10 text-white hover:border-neon-cyan hover:bg-neon-cyan/15 hover:shadow-neon-cyan/25 hover:shadow-md transition-all duration-300"
          title={isMuted ? 'Unmute Trailer' : 'Mute Trailer'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        
        {/* Visualizer bars when sound is active */}
        {!isMuted && (
          <div className="flex items-end gap-[3px] h-6">
            <span className="w-[3px] bg-neon-cyan rounded-full animate-[pulse_0.8s_infinite]" style={{ height: '70%' }} />
            <span className="w-[3px] bg-neon-purple rounded-full animate-[pulse_1.2s_infinite]" style={{ height: '100%' }} />
            <span className="w-[3px] bg-neon-cyan rounded-full animate-[pulse_0.9s_infinite]" style={{ height: '40%' }} />
            <span className="w-[3px] bg-neon-purple rounded-full animate-[pulse_1s_infinite]" style={{ height: '80%' }} />
          </div>
        )}
      </div>
    </div>
  );
}
