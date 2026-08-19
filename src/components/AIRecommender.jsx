import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Terminal, Play, RotateCcw, Sparkles } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { blockbusterMovies } from '../data/blockbusterDb';
import { getTrending } from '../utils/api';

export default function AIRecommender() {
  const navigate = useNavigate();
  const { watchlist, getContinueWatchingList } = useAppStore();
  
  const [status, setStatus] = useState('idle'); // idle, scanning, complete
  const [scannedMovie, setScannedMovie] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (text, delay) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, text]);
        resolve();
      }, delay);
    });
  };

  const startAnalysis = async () => {
    setStatus('scanning');
    setLogs([]);
    
    await addLog('> Booting Neural Recommendation Matrix v4.2.9...', 150);
    await addLog('> Establishing secure uplink to OMDb / IMDb master database...', 250);
    
    // Analyze user preferences
    const watchHistory = getContinueWatchingList();
    const watchlistCount = watchlist.length;
    const historyCount = watchHistory.length;
    
    await addLog(`> Metadata acquired: Watchlist items [${watchlistCount}], Watch history [${historyCount}]`, 300);
    await addLog('> Parsing semantic genre preferences & engagement telemetry...', 250);
    await addLog('> Running high-match compatibility sweep across active quadrant...', 350);
    
    // Select recommendation based on taste
    let preferenceGenre = 'Sci-Fi';
    if (watchlistCount > 0) {
      const genresMap = {};
      watchlist.forEach(item => {
        const itemGenres = item.genres || [];
        itemGenres.forEach(g => {
          genresMap[g] = (genresMap[g] || 0) + 1;
        });
      });
      const topGenre = Object.entries(genresMap).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topGenre) preferenceGenre = topGenre;
    }
    
    await addLog(`> Primary user interest vector: [${preferenceGenre.toUpperCase()}]`, 250);
    await addLog('> Quantum matching coefficient calculated: 0.9842', 200);
    await addLog('> Selection compiled successfully.', 150);

    // Pick a movie matching the preference genre
    try {
      const liveTrending = await getTrending('movie');
      const matchingLive = liveTrending.filter(m => m.genres?.some(g => g.toLowerCase().includes(preferenceGenre.toLowerCase())));
      if (matchingLive.length > 0) {
        setScannedMovie(matchingLive[Math.floor(Math.random() * matchingLive.length)]);
      } else {
        const candidates = blockbusterMovies.filter(m => m.genres.some(g => g.toLowerCase().includes(preferenceGenre.toLowerCase())));
        const selection = (candidates.length > 0 ? candidates : blockbusterMovies)[Math.floor(Math.random() * (candidates.length || blockbusterMovies.length))];
        setScannedMovie(selection);
      }
    } catch {
      setScannedMovie(blockbusterMovies[0]);
    }
    
    setStatus('complete');
  };

  const handlePlay = () => {
    if (scannedMovie) {
      navigate(`/player/${scannedMovie.type || 'movie'}/${scannedMovie.id}`);
    }
  };

  const handleDetails = () => {
    if (scannedMovie) {
      navigate(`/details/${scannedMovie.type || 'movie'}/${scannedMovie.id}`);
    }
  };

  return (
    <div className="relative max-w-7xl mx-auto px-4 md:px-8 my-12">
      {/* Outer Glow Wrapper */}
      <div className="relative w-full rounded-3xl overflow-hidden glass-panel border border-neon-cyan/20 p-6 md:p-10 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        
        {/* Glowing Background Mesh */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-neon-cyan/5 rounded-full filter blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-neon-purple/5 rounded-full filter blur-[80px] pointer-events-none" />

        {/* Content Header Grid */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 justify-between">
          <div className="max-w-xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/35 text-neon-cyan text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Cpu className="w-3.5 h-3.5 animate-spin" />
              <span>AI QUANTUM DISCOVERY</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              Neural Suggestion Matrix
            </h2>
            <p className="text-sm sm:text-base text-gray-400 font-light leading-relaxed">
              Unlock a personalized hyper-curation of sci-fi blockbusters. The matrix compiles your watchlist profile, aggregates historical session watchtimes, and executes a real-time quantum recommendation sweep.
            </p>
          </div>

          <div className="flex-shrink-0 w-full lg:w-auto">
            {status === 'idle' && (
              <button
                onClick={startAnalysis}
                className="w-full lg:w-auto flex items-center justify-center gap-2 py-4 px-8 rounded-2xl btn-neon-cyan text-sm sm:text-base font-extrabold text-white shadow-lg shadow-neon-cyan/25"
              >
                <Terminal className="w-5 h-5 animate-pulse" />
                <span>Initialize AI Scan</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic State Layouts */}
        <div className="relative z-10 mt-8">
          <AnimatePresence mode="wait">
            
            {/* 1. SCANNING STATE: Tech Terminal Output */}
            {status === 'scanning' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative rounded-2xl bg-black/60 border border-neon-cyan/30 p-6 font-mono text-left text-xs sm:text-sm text-neon-cyan overflow-hidden"
              >
                {/* Neon Sweeper Line */}
                <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent shadow-[0_0_10px_#06b6d4] animate-scan pointer-events-none" />
                
                {/* Print terminal lines */}
                <div className="flex flex-col gap-2 min-h-[140px] max-h-[140px] overflow-y-auto no-scrollbar">
                  {logs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {log}
                    </div>
                  ))}
                  <div className="w-2.5 h-4 bg-neon-cyan animate-pulse inline-block" />
                </div>
              </motion.div>
            )}

            {/* 2. COMPLETE STATE: Match Card */}
            {status === 'complete' && scannedMovie && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-r from-neon-purple/10 to-neon-cyan/10 border border-neon-purple/35 shadow-[0_0_20px_rgba(124,58,237,0.15)] text-left"
              >
                {/* High-res recommendation poster */}
                <div 
                  onClick={handleDetails}
                  className="relative w-28 sm:w-36 aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-lg flex-shrink-0 cursor-pointer group"
                >
                  <img
                    src={scannedMovie.poster_url}
                    alt={scannedMovie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex items-center justify-center bg-black/65 px-2 py-0.5 rounded text-[10px] font-black border border-neon-cyan text-neon-cyan">
                    98.6% MATCH
                  </div>
                </div>

                {/* Movie Details */}
                <div className="flex-1 flex flex-col items-start">
                  <div className="text-[10px] font-extrabold tracking-widest text-neon-cyan uppercase mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-neon-cyan" />
                    <span>AI COMPILED SELECTION</span>
                  </div>
                  <h3 
                    onClick={handleDetails}
                    className="text-xl sm:text-2xl font-black text-white hover:text-neon-cyan transition-colors duration-300 cursor-pointer"
                  >
                    {scannedMovie.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-300 mt-1 mb-3">
                    <span>{scannedMovie.year}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-500" />
                    {scannedMovie.runtime && (
                      <>
                        <span>{scannedMovie.runtime}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-500" />
                      </>
                    )}
                    <span className="text-neon-purple font-bold uppercase">{scannedMovie.type || 'Movie'}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 font-light line-clamp-3 leading-relaxed mb-4">
                    {scannedMovie.overview}
                  </p>
                  
                  {/* Action row */}
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={handlePlay}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl btn-neon-purple text-xs font-bold text-white shadow-md shadow-neon-purple/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Play Now</span>
                    </button>
                    <button
                      onClick={handleDetails}
                      className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all text-xs font-bold"
                    >
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={startAnalysis}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all duration-300"
                      title="Scan Again"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold hidden sm:inline">Recalibrate</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
