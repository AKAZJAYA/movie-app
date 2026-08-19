import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Compass, LayoutGrid, HardDrive, User, Film } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import MovieCard from '../components/MovieCard';

export default function Watchlist() {
  const navigate = useNavigate();
  const { watchlist } = useAppStore();

  const handleExplore = () => {
    navigate('/search');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 text-left">
      
      {/* 1. Cockpit Profile HUD Header */}
      <div className="relative w-full rounded-3xl overflow-hidden glass-panel border border-neon-purple/20 p-6 md:p-8 shadow-[0_0_20px_rgba(124,58,237,0.06)] mb-10">
        
        {/* Glowing backdrop blobs inside header */}
        <div className="absolute right-0 top-0 w-60 h-60 bg-neon-purple/5 rounded-full filter blur-[70px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-col md:flex-row text-center md:text-left">
            
            {/* Profile circular avatar */}
            <div className="relative w-16 h-16 rounded-full p-[1.5px] bg-gradient-to-tr from-neon-purple to-neon-cyan shadow-[0_0_15px_rgba(124,58,237,0.3)] select-none">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80"
                alt="Profile Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center md:justify-start gap-2">
                Pilot Deck Library
              </h1>
              <p className="text-xs text-neon-cyan font-bold tracking-widest uppercase mt-0.5 select-none">
                COORDINATES: SEC_8 / ORBIT_3
              </p>
            </div>
          </div>

          {/* Quick HUD specs counts */}
          <div className="flex items-center gap-4 sm:gap-6 bg-black/40 border border-white/5 p-3 rounded-2xl">
            <div className="flex items-center gap-2 px-3">
              <LayoutGrid className="w-4 h-4 text-neon-purple" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase">Loaded Units</span>
                <span className="text-sm font-black text-white">{watchlist.length} ITEMS</span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="flex items-center gap-2 px-3">
              <HardDrive className="w-4 h-4 text-neon-cyan" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase">Storage Status</span>
                <span className="text-sm font-black text-neon-cyan">LOCAL SECURE</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Unified Grid Results */}
      <div>
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-6 select-none">
          <span className="text-xs font-bold text-gray-400 uppercase">
            Stored Modules [{watchlist.length}]
          </span>
        </div>

        {watchlist.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
            {watchlist.map((item) => (
              <MovieCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          /* Empty Placeholder HUD */
          <div className="py-24 text-center border border-dashed border-white/10 rounded-3xl glass-panel max-w-xl mx-auto mt-8 px-4">
            <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-white mb-2">No Stored Modules</h3>
            <p className="text-sm text-gray-400 font-light max-w-md mx-auto leading-relaxed mb-6">
              Your library is currently empty. Explore coordinates, scan cinematic sectors inside the search terminal, and click 'Bookmark' to append titles to your space flight list.
            </p>
            <button
              onClick={handleExplore}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-2xl btn-neon-purple text-xs font-bold text-white shadow-md mx-auto shadow-neon-purple/20"
            >
              <Compass className="w-4 h-4 animate-spin-slow" />
              <span>Explore Coordinates</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
