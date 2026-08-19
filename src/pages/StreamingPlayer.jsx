import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Play, 
  RefreshCw, 
  Volume2, 
  Maximize, 
  Keyboard, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  HelpCircle,
  Server,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../store/useAppStore';
import { getMediaDetails, getTVSeasonEpisodes } from '../utils/api';

const STREAM_SERVERS = [
  { id: 'vaplayer', name: 'Nebula Core (VidAPI 4K HDR)', quality: '4K ULTRA HD', bit: 'Direct 4K Master' },
  { id: 'vidsrcme', name: 'VidSrc Prime (1080p Blu-Ray)', quality: '1080p BLU-RAY', bit: 'High-Bitrate CDN' },
  { id: 'autoembed', name: 'AutoEmbed HD (Adaptive 1080p)', quality: '1080p HD', bit: 'Fast Multi-Rate' },
  { id: 'vidlink', name: 'VidLink Ultra (4K / 1080p Custom)', quality: '4K / 1080p HD', bit: 'Ultra Buffer-Free' },
  { id: 'twoembed', name: '2Embed Cinema (Direct Mirror)', quality: '1080p BLU-RAY', bit: 'Global Relay' },
];

export default function StreamingPlayer() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { playbackProgress, saveProgress, preferences, setPreference } = useAppStore();

  const initialSeason = parseInt(searchParams.get('season') || '1');
  const initialEpisode = parseInt(searchParams.get('episode') || '1');

  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [currentServer, setCurrentServer] = useState('vaplayer');

  // Player States
  const [isLoading, setIsLoading] = useState(true);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [playbackState, setPlaybackState] = useState('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  // Custom HUD Overlays
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showServerPicker, setShowServerPicker] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const countdownTimerRef = useRef(null);

  // Fetch title details from OMDb
  const { data: mediaDetails } = useQuery({
    queryKey: ['mediaDetails', type, id],
    queryFn: () => getMediaDetails(type || 'movie', id),
    staleTime: 1000 * 60 * 30,
  });

  const isTV = type === 'tv' || mediaDetails?.type === 'tv';
  const { data: seasonEpisodes } = useQuery({
    queryKey: ['tvSeasonEpisodes', id, currentSeason],
    queryFn: () => getTVSeasonEpisodes(id, currentSeason),
    enabled: isTV && !!id,
    staleTime: 1000 * 60 * 30,
  });

  // Sync state with URL changes
  useEffect(() => {
    const s = parseInt(searchParams.get('season') || '1');
    const e = parseInt(searchParams.get('episode') || '1');
    setCurrentSeason(s);
    setCurrentEpisode(e);
    setPlaybackState('idle');
    setCountdown(null);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIsLoading(true);
  }, [id, type, searchParams]);

  // Construct iframe source URL for verified HD servers
  const iframeSrc = useMemo(() => {
    const isImdb = id.toString().startsWith('tt');
    const cleanId = id.toString();
    const savedProgress = playbackProgress[cleanId]?.progress || 0;
    const resumeParam = savedProgress > 10 ? `&resumeAt=${Math.round(savedProgress)}` : '';
    const colorParam = `&primaryColor=%237c3aed`;
    const langParam = `&ds_lang=${preferences.subtitleLang}&lang=${preferences.subtitleLang}`;

    if (currentServer === 'vaplayer') {
      if (isTV) {
        return `https://vaplayer.ru/embed/tv/${cleanId}/${currentSeason}/${currentEpisode}?${colorParam}${langParam}${resumeParam}`;
      }
      return `https://vaplayer.ru/embed/movie/${cleanId}?${colorParam}${langParam}${resumeParam}`;
    }

    if (currentServer === 'vidsrcme') {
      const queryParam = isImdb ? `imdb=${cleanId}` : `tmdb=${cleanId}`;
      if (isTV) {
        return `https://vidsrcme.ru/embed/tv?${queryParam}&season=${currentSeason}&episode=${currentEpisode}`;
      }
      return `https://vidsrcme.ru/embed/movie?${queryParam}`;
    }

    if (currentServer === 'autoembed') {
      const typeRoute = isImdb ? 'imdb' : 'tmdb';
      if (isTV) {
        return `https://autoembed.co/tv/${typeRoute}/${cleanId}-${currentSeason}-${currentEpisode}`;
      }
      return `https://autoembed.co/movie/${typeRoute}/${cleanId}`;
    }

    if (currentServer === 'vidlink') {
      if (isTV) {
        return `https://vidlink.pro/tv/${cleanId}/${currentSeason}/${currentEpisode}?primaryColor=7c3aed&secondaryColor=06b6d4&iconColor=7c3aed`;
      }
      return `https://vidlink.pro/movie/${cleanId}?primaryColor=7c3aed&secondaryColor=06b6d4&iconColor=7c3aed`;
    }

    if (currentServer === 'twoembed') {
      if (isTV) {
        return `https://www.2embed.cc/embedtv/${cleanId}&s=${currentSeason}&e=${currentEpisode}`;
      }
      return `https://www.2embed.cc/embed/${cleanId}`;
    }

    return `https://vaplayer.ru/embed/movie/${cleanId}`;
  }, [id, isTV, currentSeason, currentEpisode, currentServer, playbackProgress, preferences.subtitleLang]);

  // Handle postMessage player listener
  useEffect(() => {
    const handlePlayerMessage = (e) => {
      if (e.data?.type !== 'PLAYER_EVENT') return;

      const { player_info, player_status, player_progress, player_duration } = e.data.data;
      
      setPlayerInfo(player_info);
      setPlaybackState(player_status);
      setCurrentTime(player_progress);
      setTotalDuration(player_duration);
      setIsLoading(false);

      // Record progress to store
      if (player_status === 'playing' || player_status === 'paused') {
        const title = mediaDetails?.title || player_info?.title || `Stream [${id}]`;
        const itemDetails = {
          id,
          title,
          type: isTV ? 'tv' : 'movie',
          poster_url: mediaDetails?.poster_url || player_info?.poster,
          backdrop_url: mediaDetails?.backdrop_url,
          year: mediaDetails?.year || new Date().getFullYear().toString(),
          rating: mediaDetails?.rating || '8.0',
          quality: '4K BLU-RAY'
        };

        if (isTV) {
          itemDetails.season = currentSeason;
          itemDetails.episode = currentEpisode;
        }

        saveProgress(id, player_progress, player_duration, itemDetails);
      }

      if (player_status === 'completed') {
        if (isTV) {
          startNextEpisodeCountdown();
        } else {
          navigate(`/details/${type || 'movie'}/${id}`);
        }
      }
    };

    window.addEventListener('message', handlePlayerMessage);
    return () => {
      window.removeEventListener('message', handlePlayerMessage);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [id, type, isTV, currentSeason, currentEpisode, mediaDetails, saveProgress, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [iframeSrc]);

  // Keyboards shortcuts
  useEffect(() => {
    const handleKeys = (e) => {
      if (e.key.toLowerCase() === 'k') {
        setShowHotkeys(prev => !prev);
      }
      if (e.key.toLowerCase() === 's') {
        setShowSettings(prev => !prev);
      }
      if (e.key.toLowerCase() === 'n' && isTV) {
        loadNextEpisode();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isTV, currentEpisode, currentSeason]);

  const startNextEpisodeCountdown = () => {
    const nextEpNum = currentEpisode + 1;
    const hasNextEp = seasonEpisodes ? seasonEpisodes.some(e => e.episode_number === nextEpNum) : true;

    if (!hasNextEp) {
      console.log("No further episodes in this season.");
      return;
    }

    setCountdown(10);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          loadNextEpisode();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const loadNextEpisode = () => {
    const nextEp = currentEpisode + 1;
    setCurrentEpisode(nextEp);
    setCountdown(null);
    setSearchParams({ season: currentSeason.toString(), episode: nextEp.toString() });
  };

  const selectEpisode = (s, e) => {
    setCurrentSeason(s);
    setCurrentEpisode(e);
    setShowEpisodeDrawer(false);
    setSearchParams({ season: s.toString(), episode: e.toString() });
  };

  const handleBack = () => {
    navigate(`/details/${type || 'movie'}/${id}`);
  };

  const activeServerInfo = STREAM_SERVERS.find(s => s.id === currentServer);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center select-none">
      
      {/* A. Dynamic Overlay Iframe Container */}
      <iframe
        key={iframeSrc}
        src={iframeSrc}
        title="NebulaFlix HD Streaming Iframe"
        className="w-full h-full border-0 z-10"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      />

      {/* B. Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-space-900 text-center px-4">
          <div className="relative flex items-center justify-center w-20 h-20 mb-6">
            <span className="absolute inset-0 rounded-full border-[3px] border-neon-purple/20 border-t-neon-purple animate-spin" />
            <span className="absolute inset-2 rounded-full border-[3px] border-neon-cyan/20 border-b-neon-cyan animate-[spin_1.5s_linear_infinite_reverse]" />
            <span className="w-4 h-4 rounded-full bg-neon-cyan animate-pulse shadow-neon-cyan" />
          </div>
          <h2 className="text-xl font-bold tracking-widest text-white uppercase select-none">
            {mediaDetails?.title || 'STREAMING MASTER HD FEED...'}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-neon-cyan/15 border border-neon-cyan text-neon-cyan">
              {activeServerInfo?.quality}
            </span>
            <span className="text-xs text-gray-400">
              Server: {activeServerInfo?.name.split(' ')[0]} {isTV ? `• S${currentSeason} E${currentEpisode}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* C. Floating Controls HUD - Top Left */}
      <div className="absolute top-6 left-6 z-40 flex items-center gap-3">
        {/* Back Action */}
        <button
          onClick={handleBack}
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl glass-panel bg-black/60 border border-white/10 hover:border-neon-purple hover:bg-neon-purple/20 hover:text-white transition-all text-gray-300 font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </button>

        {/* Server Switcher Button */}
        <button
          onClick={() => setShowServerPicker(!showServerPicker)}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl glass-panel bg-black/60 border border-white/10 text-gray-300 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all text-xs font-bold"
          title="Switch 1080p/4K HD Server"
        >
          <Server className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="hidden sm:inline">Server:</span>
          <span className="text-neon-cyan">{activeServerInfo?.name.split(' ')[0]}</span>
          <span className="text-[9px] bg-neon-cyan/20 text-neon-cyan px-1 rounded font-black hidden md:inline">
            {activeServerInfo?.quality}
          </span>
        </button>

        {/* Episodes Drawer Toggle for TV Series */}
        {isTV && (
          <button
            onClick={() => setShowEpisodeDrawer(!showEpisodeDrawer)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl glass-panel bg-black/60 border border-white/10 text-gray-300 hover:text-neon-purple hover:border-neon-purple/40 transition-all text-xs font-bold"
          >
            <Layers className="w-3.5 h-3.5 text-neon-purple" />
            <span>S{currentSeason}:E{currentEpisode}</span>
          </button>
        )}
      </div>

      {/* D. Floating Controls HUD - Top Right */}
      <div className="absolute top-6 right-6 z-40 flex items-center gap-2">
        {/* Quality HUD Badge */}
        <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-xl glass-panel bg-black/60 border border-neon-cyan/30 text-neon-cyan text-[10px] font-black uppercase">
          <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan" />
          <span>{activeServerInfo?.quality}</span>
        </div>

        {/* Next Episode Button if TV */}
        {isTV && (
          <button
            onClick={loadNextEpisode}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl glass-panel bg-black/60 border border-white/10 text-gray-300 hover:text-white hover:border-neon-cyan text-xs font-bold"
            title="Next Episode [N]"
          >
            <span>Next Ep</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Hotkeys Toggle */}
        <button
          onClick={() => setShowHotkeys(!showHotkeys)}
          className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl glass-panel bg-black/60 border border-white/10 text-gray-300 hover:text-neon-cyan transition-all"
          title="Keyboard shortcuts [K]"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Settings Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center justify-center w-9 h-9 rounded-xl glass-panel bg-black/60 border border-white/10 text-gray-300 hover:text-neon-cyan transition-all"
          title="Player Preferences [S]"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* E. Server Selection Popover */}
      <AnimatePresence>
        {showServerPicker && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-6 z-40 w-80 rounded-2xl glass-panel-glow border border-white/10 bg-space-900/95 shadow-2xl p-4 text-left"
          >
            <h3 className="text-xs font-black tracking-wider text-neon-cyan uppercase border-b border-white/5 pb-2 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>Verified 1080p / 4K Relays</span>
              </span>
              <span className="text-[9px] text-green-400 font-bold">ONLINE</span>
            </h3>
            <div className="flex flex-col gap-2">
              {STREAM_SERVERS.map((server) => {
                const isActive = currentServer === server.id;
                return (
                  <button
                    key={server.id}
                    onClick={() => {
                      setCurrentServer(server.id);
                      setShowServerPicker(false);
                      setIsLoading(true);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-neon-purple/25 border border-neon-purple text-white shadow-sm' 
                        : 'hover:bg-white/5 text-gray-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span>{server.name}</span>
                      <span className="text-[9px] text-gray-400 font-normal">{server.bit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 px-1.5 py-0.5 rounded font-black">
                        {server.quality}
                      </span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* F. TV Episode Selection Drawer */}
      <AnimatePresence>
        {showEpisodeDrawer && isTV && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="absolute top-20 left-6 z-40 w-80 max-h-[70vh] rounded-2xl glass-panel-glow border border-white/10 bg-space-900/95 shadow-2xl p-4 overflow-y-auto text-left no-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <h3 className="text-xs font-black tracking-wider text-neon-purple uppercase">
                Season {currentSeason} Episodes
              </h3>
              <button 
                onClick={() => setShowEpisodeDrawer(false)}
                className="text-[10px] text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {seasonEpisodes && seasonEpisodes.length > 0 ? (
                seasonEpisodes.map((ep) => {
                  const isActive = currentEpisode === ep.episode_number;
                  return (
                    <button
                      key={ep.episode_number}
                      onClick={() => selectEpisode(currentSeason, ep.episode_number)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-neon-purple/20 border border-neon-purple text-white'
                          : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center font-bold text-[10px] text-neon-cyan">
                        {ep.episode_number}
                      </span>
                      <div className="flex-1 truncate">
                        <div className="text-xs font-bold truncate">{ep.name || `Episode ${ep.episode_number}`}</div>
                        <span className="text-[9px] text-gray-500">{ep.runtime || '45 min'}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-gray-500">Loading episodes in HD...</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* G. Subtitles & Preferences Sidebar */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute top-20 right-6 z-40 w-64 rounded-2xl glass-panel-glow border border-white/10 bg-space-900/95 shadow-2xl p-5 text-left"
          >
            <h3 className="text-sm font-black tracking-wider text-white uppercase border-b border-white/5 pb-2 mb-4">
              Quantum Player Controls
            </h3>
            
            <div className="mb-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Active Quality</span>
              <span className="text-xs font-bold text-neon-cyan flex items-center gap-1.5 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow shadow-neon-cyan animate-pulse" />
                {activeServerInfo?.quality} (Master Bitrate)
              </span>
            </div>

            <div className="mb-4">
              <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1.5">Subtitle Track</label>
              <div className="bg-white/5 border border-white/5 p-1.5 rounded-xl">
                <select
                  value={preferences.subtitleLang}
                  onChange={(e) => setPreference('subtitleLang', e.target.value)}
                  className="bg-transparent text-xs font-bold text-white w-full outline-none border-0 cursor-pointer"
                >
                  <option value="en" className="bg-space-900 text-white">English (Default)</option>
                  <option value="es" className="bg-space-900 text-white">Spanish (es)</option>
                  <option value="fr" className="bg-space-900 text-white">French (fr)</option>
                  <option value="de" className="bg-space-900 text-white">German (de)</option>
                  <option value="ru" className="bg-space-900 text-white">Russian (ru)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <span className="text-xs text-gray-300 font-bold">Auto-play Next</span>
              <button
                onClick={() => setPreference('autoplayNext', !preferences.autoplayNext)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-300 flex items-center p-0.5 ${
                  preferences.autoplayNext ? 'bg-neon-purple' : 'bg-gray-700'
                }`}
              >
                <motion.span
                  layout
                  className="w-4 h-4 rounded-full bg-white shadow-sm"
                  animate={{ x: preferences.autoplayNext ? 20 : 0 }}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* H. Keyboard Shortcuts HUD */}
      <AnimatePresence>
        {showHotkeys && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-20 left-6 z-40 max-w-sm rounded-2xl glass-panel-glow border border-white/10 bg-space-900/95 shadow-2xl p-5 text-left"
          >
            <h3 className="text-xs font-black tracking-wider text-neon-cyan uppercase border-b border-white/5 pb-2 mb-3 select-none flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              HOTKEYS HUD PANEL
            </h3>
            <div className="flex flex-col gap-2.5 font-mono text-[10px] sm:text-xs text-gray-300">
              <div className="flex items-center justify-between">
                <kbd className="bg-white/10 px-2 py-0.5 rounded border border-white/10 font-bold text-white">N</kbd>
                <span className="text-right text-gray-400">Next TV Episode</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="bg-white/10 px-2 py-0.5 rounded border border-white/10 font-bold text-white">S</kbd>
                <span className="text-right text-gray-400">Preferences Menu</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="bg-white/10 px-2 py-0.5 rounded border border-white/10 font-bold text-white">K</kbd>
                <span className="text-right text-gray-400">Dismiss Hotkeys</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="bg-white/10 px-2 py-0.5 rounded border border-white/10 font-bold text-white">Esc</kbd>
                <span className="text-right text-gray-400">Exit Cinema Mode</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* I. Auto-play Countdown Modal */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-4"
          >
            <div className="relative w-28 h-28 flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-neon-purple/20 border-t-neon-purple animate-spin" />
              <span className="text-3xl font-black text-white">{countdown}</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest">
              EPISODE COMPLETED
            </h2>
            <p className="text-sm text-neon-cyan mt-1 font-bold uppercase tracking-wider mb-8">
              Auto-playing Next Episode in Full HD...
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={loadNextEpisode}
                className="flex items-center gap-1.5 py-3 px-6 rounded-2xl btn-neon-purple text-xs font-bold text-white shadow-md shadow-neon-purple/20"
              >
                <span>Play Now</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                  setCountdown(null);
                }}
                className="py-3 px-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-colors text-xs font-bold"
              >
                Cancel Countdown
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
