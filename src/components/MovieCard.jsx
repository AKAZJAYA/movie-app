import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Play, Plus, Check } from 'lucide-react';
import useAppStore from '../store/useAppStore';

export default function MovieCard({ item }) {
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useAppStore();

  const isBookmarked = watchlist.some((x) => x.id === item.id);

  const handleCardClick = () => {
    navigate(`/details/${item.type || 'movie'}/${item.id}`);
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    navigate(`/details/${item.type || 'movie'}/${item.id}`);
  };

  const handleBookmarkToggle = (e) => {
    e.stopPropagation();
    if (isBookmarked) {
      removeFromWatchlist(item.id);
    } else {
      addToWatchlist(item);
    }
  };

  // Safe variables for data
  const genres = item.genres || (item.genre ? item.genre.split(', ').slice(0, 2) : ['Movie']);
  const numericRating = Number.parseFloat(item.rating);
  const rating = Number.isFinite(numericRating) && numericRating > 0
    ? numericRating.toFixed(1)
    : null;

  return (
    <motion.div
      onClick={handleCardClick}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="group relative flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] aspect-[2/3] rounded-2xl overflow-hidden glass-card cursor-pointer shadow-lg border border-white/5 hover:border-neon-purple/40 hover:shadow-[0_0_20px_rgba(124,58,237,0.25)] transition-all duration-300 select-none"
    >
      {/* Dynamic glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-neon-purple/0 to-neon-cyan/0 group-hover:from-neon-purple/5 group-hover:to-neon-cyan/5 transition-all duration-500" />

      {/* Poster Image */}
      <img
        src={item.poster_url}
        alt={item.title}
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        loading="lazy"
      />

      {/* Shadow Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-space-900 via-space-900/40 to-transparent opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />

      {/* Hover Information / Quick Actions Panel */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4 text-left transform translate-y-2 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-400 ease-[0.23,1,0.32,1]">
        
        {/* Rating */}
        <div className="flex items-center mb-1.5">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-extrabold text-white">{rating || 'N/A'}</span>
            {rating && <span className="text-[10px] text-gray-400">/ 10</span>}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm md:text-base font-extrabold text-white line-clamp-1 group-hover:text-neon-cyan transition-colors duration-300">
          {item.title}
        </h3>

        {/* Metadata (Year & Type) */}
        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-300 mt-1 mb-2 font-medium">
          <span>{item.year}</span>
          <span className="w-1 h-1 rounded-full bg-gray-500" />
          <span className="uppercase text-neon-cyan text-[9px] font-bold border border-neon-cyan/30 px-1 rounded">
            {item.type === 'tv' ? 'Series' : 'Movie'}
          </span>
        </div>

        {/* Genre Tags (only shows on md screens) */}
        <div className="hidden sm:flex flex-wrap gap-1 mb-3">
          {genres.slice(0, 2).map((g, idx) => (
            <span key={idx} className="text-[9px] bg-white/5 border border-white/5 text-gray-400 px-2 py-0.5 rounded-full font-medium">
              {g}
            </span>
          ))}
        </div>

        {/* Quick Action Bar */}
        <div className="flex items-center gap-2">
          {/* Quick Play Button */}
          <button
            onClick={handlePlayClick}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 px-3 rounded-xl btn-neon-purple text-xs font-bold text-white shadow-md shadow-neon-purple/20"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Watch options</span>
          </button>

          {/* Quick Watchlist Bookmark Button */}
          <button
            onClick={handleBookmarkToggle}
            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 ${
              isBookmarked
                ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan shadow-sm shadow-neon-cyan/25'
                : 'bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white'
            }`}
            title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            {isBookmarked ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
