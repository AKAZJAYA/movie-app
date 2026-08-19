import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, ShieldCheck } from 'lucide-react';

// Data & Store
import { blockbusterMovies, blockbusterTV } from '../data/blockbusterDb';
import useAppStore from '../store/useAppStore';
import { 
  getTrending, 
  getTopRatedMovies, 
  getPopularTVShows, 
  getLatestMovies 
} from '../utils/api';

// Components
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import AIRecommender from '../components/AIRecommender';
import TrailerModal from '../components/TrailerModal';

export default function Home() {
  const navigate = useNavigate();
  const { getContinueWatchingList } = useAppStore();

  const continueWatchingList = getContinueWatchingList();

  // 1. Fetch live Trending 4K Blu-Ray Movies via OMDb
  const { data: trendingMovies, isLoading: isTrendingLoading } = useQuery({
    queryKey: ['omdbTrendingMovies'],
    queryFn: () => getTrending('movie'),
    staleTime: 1000 * 60 * 10,
  });

  // 2. Fetch live Top Rated 1080p Masterpieces via OMDb
  const { data: topRatedMovies, isLoading: isTopRatedLoading } = useQuery({
    queryKey: ['omdbTopRatedMovies'],
    queryFn: () => getTopRatedMovies(),
    staleTime: 1000 * 60 * 10,
  });

  // 3. Fetch live Popular Space & Sci-Fi TV Series via OMDb
  const { data: popularTVShows, isLoading: isTVLoading } = useQuery({
    queryKey: ['omdbPopularTVShows'],
    queryFn: () => getPopularTVShows(),
    staleTime: 1000 * 60 * 10,
  });

  // 4. Fetch live Latest HD Feed
  const { data: liveMovies, isLoading: isLiveLoading } = useQuery({
    queryKey: ['omdbLatestFeed'],
    queryFn: () => getLatestMovies(),
    staleTime: 1000 * 60 * 5,
  });

  // Core Hero Featured Movie (Defaults to Dune 2 or highest rated live blockbuster)
  const featuredMovie = (trendingMovies && trendingMovies.length > 0)
    ? (trendingMovies.find(m => m.trailer_url) || trendingMovies[0])
    : blockbusterMovies[0];

  // Trailer Modal State
  const [trailer, setTrailer] = useState({
    isOpen: false,
    url: '',
    title: ''
  });

  const openTrailer = (movie) => {
    setTrailer({
      isOpen: true,
      url: movie.trailer_url || 'https://www.youtube.com/embed/Way9Dexny3w',
      title: movie.title
    });
  };

  const handleContinuePlay = (item) => {
    let url = `/player/${item.type || 'movie'}/${item.id}`;
    if (item.type === 'tv' && item.progress) {
      const savedProgress = useAppStore.getState().playbackProgress[item.id];
      if (savedProgress?.item?.season) {
        url += `?season=${savedProgress.item.season}&episode=${savedProgress.item.episode}`;
      }
    }
    navigate(url);
  };

  return (
    <div className="relative w-full overflow-hidden bg-space-900 pb-12">
      {/* Dynamic Cinematic Hero Backdrop */}
      <HeroBanner 
        movie={featuredMovie} 
        onOpenTrailer={() => openTrailer(featuredMovie)} 
      />

      {/* Main Shelves Containers */}
      <div className="relative z-20 -mt-16 sm:-mt-24 md:-mt-32">
        
        {/* 1. CONTINUE WATCHING ROW */}
        {continueWatchingList.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 my-10 select-none text-left">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-6 rounded-full bg-neon-pink shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
              <h2 className="text-lg md:text-xl font-bold tracking-wider text-white">
                Continue Watching
              </h2>
            </div>

            <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-2">
              {continueWatchingList.map((item) => (
                <motion.div
                  key={item.id}
                  onClick={() => handleContinuePlay(item)}
                  whileHover={{ scale: 1.03 }}
                  className="flex-shrink-0 relative w-[220px] sm:w-[260px] aspect-video rounded-xl overflow-hidden glass-card cursor-pointer border border-white/5 hover:border-neon-pink/40 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] transition-all duration-300"
                >
                  {/* Backdrop */}
                  <img
                    src={item.backdrop_url || item.poster_url}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-60 hover:opacity-75 transition-opacity duration-300"
                  />

                  {/* Shading Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-space-900 via-space-900/30 to-transparent" />

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/30">
                    <div className="w-11 h-11 rounded-full bg-neon-pink flex items-center justify-center text-white shadow-md shadow-neon-pink/40">
                      <Play className="w-5 h-5 fill-white" />
                    </div>
                  </div>

                  {/* Title & Metadata overlay */}
                  <div className="absolute bottom-3 left-3 right-3 text-left">
                    <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-1">
                      {item.title}
                    </h3>
                    
                    {item.type === 'tv' && (
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">
                        {item.season ? `Season ${item.season} • Ep ${item.episode}` : 'Active Session'}
                      </span>
                    )}
                  </div>

                  {/* Neon Progress Bar Slider */}
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/20">
                    <div 
                      className="h-full bg-neon-pink shadow-[0_0_6px_#ec4899]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 2. TRENDING 4K BLU-RAY MASTERPIECES */}
        <MovieRow 
          title="Trending 4K Blu-Ray Blockbusters" 
          items={trendingMovies || blockbusterMovies} 
          isLoading={isTrendingLoading}
        />

        {/* 3. TOP RATED 1080P MASTERPIECES */}
        <MovieRow 
          title="Top Rated 1080p Masterpieces" 
          items={topRatedMovies || blockbusterMovies} 
          isLoading={isTopRatedLoading}
        />

        {/* 4. NEURAL SUGGESTION SCANNER MATRIX */}
        <AIRecommender />

        {/* 5. POPULAR TV SHOWS ROW */}
        <MovieRow 
          title="Popular Space & Sci-Fi Series" 
          items={popularTVShows || blockbusterTV} 
          isLoading={isTVLoading}
        />

        {/* 6. LIVE RELEASES ROW */}
        <MovieRow 
          title="Recently Added in Full HD" 
          items={liveMovies || []} 
          isLoading={isLiveLoading} 
        />

      </div>

      {/* Global Video Lightbox */}
      <TrailerModal
        isOpen={trailer.isOpen}
        onClose={() => setTrailer(prev => ({ ...prev, isOpen: false }))}
        trailerUrl={trailer.url}
        movieTitle={trailer.title}
      />
    </div>
  );
}
