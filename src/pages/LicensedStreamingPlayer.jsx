import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Film,
  Layers,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Server,
  Sparkles,
  Tv,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import useAppStore from '../store/useAppStore';
import { getMediaDetails, getTVSeasonEpisodes } from '../utils/api';
import { getStreamEntry } from '../utils/streamCatalog';
import HlsDirectPlayer from '../components/HlsDirectPlayer';

const parsePositiveInteger = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Available streaming servers that stream the exact full movie and TV series
const STREAM_SERVERS = [
  {
    id: 'vidapi',
    name: 'Server 1 (VidAPI)',
    tag: 'Primary HD • Multi-Subtitles',
    quality: '1080p / 4K',
    buildUrl: ({ tmdbId, imdbId, type, season, episode, title, resumeAt }) => {
      const targetId = imdbId || tmdbId;
      const cleanTitle = encodeURIComponent(title || 'Movie');
      const resumeParam = resumeAt > 15 ? `&resumeAt=${Math.floor(resumeAt)}` : '';
      if (type === 'tv') {
        return `https://vaplayer.ru/embed/tv/${targetId}/${season}/${episode}?primaryColor=%238b5cf6&title=${cleanTitle}&lang=en${resumeParam}`;
      }
      return `https://vaplayer.ru/embed/movie/${targetId}?primaryColor=%238b5cf6&title=${cleanTitle}&lang=en${resumeParam}`;
    },
  },
  {
    id: 'vidsrc_to',
    name: 'Server 2 (VidSrc To)',
    tag: 'High Speed HD Stream',
    quality: '1080p',
    buildUrl: ({ tmdbId, imdbId, type, season, episode }) => {
      const targetId = imdbId || tmdbId;
      if (type === 'tv') {
        return `https://vidsrc.to/embed/tv/${targetId}/${season}/${episode}`;
      }
      return `https://vidsrc.to/embed/movie/${targetId}`;
    },
  },
  {
    id: 'vidsrc_cc',
    name: 'Server 3 (VidSrc CC)',
    tag: 'Ultra Fast Mirror',
    quality: '1080p HD',
    buildUrl: ({ tmdbId, imdbId, type, season, episode }) => {
      const targetId = tmdbId || imdbId;
      const imdbQuery = imdbId ? `?imdb=${imdbId}` : '';
      if (type === 'tv') {
        return `https://vidsrc.cc/v2/embed/tv/${targetId}/${season}/${episode}${imdbQuery}`;
      }
      return `https://vidsrc.cc/v2/embed/movie/${targetId}${imdbQuery}`;
    },
  },
  {
    id: 'vidsrc_me',
    name: 'Server 4 (VidSrc Me)',
    tag: 'Alternative Stream CDN',
    quality: '1080p / 720p',
    buildUrl: ({ tmdbId, imdbId, type, season, episode }) => {
      const imdbPart = imdbId ? `imdb=${imdbId}&` : '';
      if (type === 'tv') {
        return `https://vidsrc.me/embed/tv?${imdbPart}tmdb=${tmdbId || ''}&season=${season}&episode=${episode}`;
      }
      return `https://vidsrc.me/embed/movie?${imdbPart}tmdb=${tmdbId || ''}`;
    },
  },
  {
    id: 'smashy',
    name: 'Server 5 (SmashyStream)',
    tag: 'Multi-Source HD Player',
    quality: '1080p',
    buildUrl: ({ tmdbId, imdbId, type, season, episode }) => {
      const targetId = imdbId || tmdbId;
      if (type === 'tv') {
        return `https://player.smashy.stream/tv/${targetId}?s=${season}&e=${episode}`;
      }
      return `https://player.smashy.stream/movie/${targetId}`;
    },
  },
  {
    id: 'autoembed',
    name: 'Server 6 (AutoEmbed)',
    tag: 'Global CDN Player',
    quality: '1080p HD',
    buildUrl: ({ tmdbId, imdbId, type, season, episode }) => {
      const targetId = tmdbId || imdbId;
      if (type === 'tv') {
        return `https://player.autoembed.cc/embed/tv/${targetId}/${season}/${episode}`;
      }
      return `https://player.autoembed.cc/embed/movie/${targetId}`;
    },
  },
  {
    id: '2embed',
    name: 'Server 7 (2Embed)',
    tag: 'Backup Server',
    quality: '720p / 1080p',
    buildUrl: ({ tmdbId, imdbId, type, season, episode }) => {
      const targetId = tmdbId || imdbId;
      if (type === 'tv') {
        return `https://www.2embed.cc/embedtv/${targetId}&s=${season}&e=${episode}`;
      }
      return `https://www.2embed.cc/embed/${targetId}`;
    },
  },
];

export default function LicensedStreamingPlayer() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const currentSeason = parsePositiveInteger(seasonParam, 1);
  const currentEpisode = parsePositiveInteger(episodeParam, 1);

  // Read saved progress once on mount without causing re-render loops
  const initialSavedProgress = useRef(
    useAppStore.getState().playbackProgress[id]?.progress || 0,
  ).current;

  // Defaults to Server 1 (VidAPI) which streams the exact requested movie
  const [useDirectStream, setUseDirectStream] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playerContainerRef = useRef(null);
  const lastSaveTimeRef = useRef(0);

  // Fetch title metadata
  const { data: mediaDetails } = useQuery({
    queryKey: ['mediaDetails', type, id],
    queryFn: () => getMediaDetails(type || 'movie', id),
    staleTime: 1000 * 60 * 30,
  });

  const isTV = type === 'tv' || mediaDetails?.type === 'tv';

  // Fetch season episodes if it's a TV show
  const { data: seasonEpisodes } = useQuery({
    queryKey: ['tvSeasonEpisodes', id, currentSeason],
    queryFn: () => getTVSeasonEpisodes(id, currentSeason),
    enabled: isTV && Boolean(id),
    staleTime: 1000 * 60 * 30,
  });

  // Check for custom direct stream entry in streams.json (if configured by user)
  const { data: directStreamEntry } = useQuery({
    queryKey: ['streamEntry', isTV ? 'tv' : 'movie', id, currentSeason, currentEpisode],
    queryFn: ({ signal }) => getStreamEntry({
      type: isTV ? 'tv' : 'movie',
      id,
      season: currentSeason,
      episode: currentEpisode,
      signal,
    }),
    staleTime: 1000 * 60 * 30,
  });

  const hasCustomDirectStream = Boolean(directStreamEntry?.sources?.length);
  const activeDirectSource = directStreamEntry?.sources?.[0] || null;

  // Build current progress metadata item
  const buildProgressItem = useCallback(() => ({
    id,
    title: mediaDetails?.title || `Media ${id}`,
    type: isTV ? 'tv' : 'movie',
    poster_url: mediaDetails?.poster_url,
    backdrop_url: mediaDetails?.backdrop_url,
    year: mediaDetails?.year,
    rating: mediaDetails?.rating,
    server: useDirectStream ? 'Custom Direct Stream' : (STREAM_SERVERS[selectedServerIndex]?.name || 'Nebula Stream'),
    ...(isTV ? { season: currentSeason, episode: currentEpisode } : {}),
  }), [id, mediaDetails, isTV, useDirectStream, selectedServerIndex, currentSeason, currentEpisode]);

  // Compute embed URL for the active streaming server
  const activeServer = STREAM_SERVERS[selectedServerIndex] || STREAM_SERVERS[0];
  const tmdbId = mediaDetails?.tmdb_id || (id && !String(id).startsWith('tt') ? id : null);
  const imdbId = mediaDetails?.imdb_id || (id && String(id).startsWith('tt') ? id : null);

  const embedUrl = useMemo(() => {
    return activeServer.buildUrl({
      tmdbId: tmdbId || id,
      imdbId: imdbId || id,
      type: isTV ? 'tv' : 'movie',
      season: currentSeason,
      episode: currentEpisode,
      title: mediaDetails?.title || '',
      resumeAt: initialSavedProgress,
    });
  }, [activeServer, tmdbId, imdbId, id, isTV, currentSeason, currentEpisode, mediaDetails?.title, initialSavedProgress]);

  // Listen for VidAPI (VAPlayer) postMessage PLAYER_EVENT
  useEffect(() => {
    const handlePlayerMessage = (event) => {
      if (!event.data || event.data.type !== 'PLAYER_EVENT') return;

      const { player_status, player_progress, player_duration } = event.data.data || {};
      if (player_status === 'playing' || player_status === 'paused') {
        const progressSec = Number.parseFloat(player_progress) || 0;
        const durationSec = Number.parseFloat(player_duration) || 0;

        const now = Date.now();
        if (now - lastSaveTimeRef.current > 8000) {
          lastSaveTimeRef.current = now;
          if (durationSec > 0 && progressSec > 0) {
            useAppStore.getState().saveProgress(id, progressSec, durationSec, buildProgressItem());
          }
        }
      }

      if (player_status === 'completed' && isTV) {
        setCountdown(10);
      }
    };

    window.addEventListener('message', handlePlayerMessage);
    return () => window.removeEventListener('message', handlePlayerMessage);
  }, [id, isTV, buildProgressItem]);

  // Next & Previous episode calculations
  const nextEpisodeNumber = useMemo(() => {
    if (!isTV) return null;
    if (!seasonEpisodes?.length) return currentEpisode + 1;
    const next = seasonEpisodes.find((ep) => ep.episode_number > currentEpisode);
    return next ? next.episode_number : null;
  }, [isTV, seasonEpisodes, currentEpisode]);

  const prevEpisodeNumber = useMemo(() => {
    if (!isTV || currentEpisode <= 1) return null;
    return currentEpisode - 1;
  }, [isTV, currentEpisode]);

  const loadEpisode = useCallback((season, episode) => {
    setCountdown(null);
    setShowEpisodesDrawer(false);
    setSearchParams({ season: String(season), episode: String(episode) });
  }, [setSearchParams]);

  const loadNextEpisode = useCallback(() => {
    if (nextEpisodeNumber) {
      loadEpisode(currentSeason, nextEpisodeNumber);
    }
  }, [nextEpisodeNumber, currentSeason, loadEpisode]);

  const loadPrevEpisode = useCallback(() => {
    if (prevEpisodeNumber) {
      loadEpisode(currentSeason, prevEpisodeNumber);
    }
  }, [prevEpisodeNumber, currentSeason, loadEpisode]);

  // Countdown timer for next episode autoplay
  useEffect(() => {
    if (countdown === null) return undefined;
    const timer = window.setTimeout(() => {
      if (countdown <= 1) {
        loadNextEpisode();
      } else {
        setCountdown((val) => val - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, loadNextEpisode]);

  // Keyboard shortcuts (Escape to exit, F for fullscreen, S for server switcher, N for next episode)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        navigate(`/details/${type || 'movie'}/${id}`);
      }
      if (e.key.toLowerCase() === 's') {
        setShowServerMenu((prev) => !prev);
      }
      if (e.key.toLowerCase() === 'e' && isTV) {
        setShowEpisodesDrawer((prev) => !prev);
      }
      if (e.key.toLowerCase() === 'n' && nextEpisodeNumber) {
        loadNextEpisode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, type, id, isTV, nextEpisodeNumber, loadNextEpisode]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleBack = () => {
    navigate(`/details/${type || 'movie'}/${id}`);
  };

  const currentEpisodeDetails = seasonEpisodes?.find(
    (ep) => ep.episode_number === currentEpisode,
  );

  return (
    <div
      ref={playerContainerRef}
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-black text-white selection:bg-neon-purple/50"
    >
      {/* 1. TOP FLOATING HUD CONTROLS BAR */}
      <div className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 md:px-8 md:py-5">
        {/* Left Side: Back button + Title & Status */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="glass-panel flex items-center gap-2 rounded-2xl bg-black/60 px-3.5 py-2.5 text-xs font-black text-gray-200 backdrop-blur-md transition-all duration-300 hover:border-neon-purple hover:bg-neon-purple/20 hover:text-white"
            title="Return to Details (Esc)"
          >
            <ArrowLeft className="h-4 w-4 text-neon-cyan" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <h1 className="max-w-[200px] truncate text-sm font-black text-white drop-shadow sm:max-w-md md:text-base">
                {mediaDetails?.title || 'Loading Media...'}
              </h1>
              <span className="rounded border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[9px] font-black uppercase text-neon-cyan shadow-sm">
                {isTV ? 'TV Series' : 'Movie'}
              </span>
            </div>
            {isTV && (
              <p className="mt-0.5 truncate text-[11px] font-bold text-gray-300">
                Season {currentSeason} • Episode {currentEpisode}
                {currentEpisodeDetails?.name ? ` : ${currentEpisodeDetails.name}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Server Switcher + Episode Drawer + Fullscreen Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* TV Episodes Drawer Button */}
          {isTV && (
            <button
              type="button"
              onClick={() => setShowEpisodesDrawer((shown) => !shown)}
              className={`glass-panel flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-black transition-all duration-300 ${
                showEpisodesDrawer
                  ? 'border-neon-purple bg-neon-purple/30 text-white shadow-lg shadow-neon-purple/20'
                  : 'bg-black/60 text-gray-200 hover:border-neon-purple hover:bg-neon-purple/10'
              }`}
              title="Episodes List (E)"
            >
              <Layers className="h-4 w-4 text-neon-purple" />
              <span className="hidden sm:inline">Episodes</span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-neon-cyan">
                S{currentSeason}:E{currentEpisode}
              </span>
            </button>
          )}

          {/* Server Switcher Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowServerMenu((shown) => !shown)}
              className={`glass-panel flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-black transition-all duration-300 ${
                showServerMenu
                  ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan shadow-lg shadow-neon-cyan/20'
                  : 'bg-black/60 text-gray-200 hover:border-neon-cyan hover:bg-neon-cyan/10'
              }`}
              title="Switch Streaming Server (S)"
            >
              {useDirectStream ? (
                <>
                  <Zap className="h-4 w-4 text-neon-cyan fill-neon-cyan" />
                  <span className="hidden md:inline">Custom Stream</span>
                  <span className="rounded bg-neon-cyan/20 px-1.5 py-0.5 text-[9px] font-bold text-neon-cyan">
                    Direct
                  </span>
                </>
              ) : (
                <>
                  <Server className="h-4 w-4 text-neon-cyan" />
                  <span className="hidden md:inline">{activeServer.name.split(' ')[0]} {activeServer.name.split(' ')[1]}</span>
                  <span className="rounded bg-neon-purple/30 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {activeServer.quality}
                  </span>
                </>
              )}
            </button>

            {/* Server Selection Dropdown */}
            <AnimatePresence>
              {showServerMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="glass-panel-glow absolute right-0 top-14 z-50 w-72 rounded-3xl bg-space-900/95 p-3.5 shadow-2xl backdrop-blur-xl border border-white/15"
                >
                  <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2 px-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-neon-cyan" />
                      <h2 className="text-xs font-black uppercase tracking-wider text-white">
                        Streaming Servers
                      </h2>
                    </div>
                    <span className="text-[10px] text-gray-400">Switch if buffering</span>
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
                    {/* Custom Direct Stream option if provided in streams.json */}
                    {hasCustomDirectStream && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseDirectStream(true);
                          setShowServerMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl p-2.5 text-left transition-all ${
                          useDirectStream
                            ? 'border border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                            : 'border border-transparent bg-white/5 text-gray-300 hover:border-white/15 hover:bg-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-white">Custom Direct Stream</span>
                            <span className="rounded bg-neon-cyan/20 px-1 py-0.2 text-[8px] font-black text-neon-cyan">
                              DIRECT
                            </span>
                          </div>
                          <span className="block text-[10px] text-gray-400">
                            Loaded from streams.json
                          </span>
                        </div>
                        {useDirectStream && <Check className="h-4 w-4 text-neon-cyan flex-shrink-0" />}
                      </button>
                    )}

                    {STREAM_SERVERS.map((server, index) => {
                      const isSelected = !useDirectStream && index === selectedServerIndex;
                      return (
                        <button
                          key={server.id}
                          type="button"
                          onClick={() => {
                            setUseDirectStream(false);
                            setSelectedServerIndex(index);
                            setIsIframeLoading(true);
                            setShowServerMenu(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-2xl p-2.5 text-left transition-all ${
                            isSelected
                              ? 'border border-neon-purple/80 bg-neon-purple/20 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                              : 'border border-transparent bg-white/5 text-gray-300 hover:border-white/15 hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white">{server.name}</span>
                              {index === 0 && (
                                <span className="rounded bg-neon-cyan/20 px-1 py-0.2 text-[8px] font-black text-neon-cyan">
                                  BEST
                                </span>
                              )}
                            </div>
                            <span className="block text-[10px] text-gray-400">
                              {server.tag} • {server.quality}
                            </span>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-neon-cyan flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-2.5 text-center text-[9px] text-gray-400">
                    Press <kbd className="rounded bg-white/10 px-1 font-mono text-neon-cyan">S</kbd> to toggle server selector anytime
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="glass-panel flex h-10 w-10 items-center justify-center rounded-2xl bg-black/60 text-gray-200 backdrop-blur-md transition-all duration-300 hover:border-neon-cyan hover:text-neon-cyan"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN STREAMING PLAYER (Streams the exact requested movie) */}
      <div className="relative h-full w-full bg-black">
        {useDirectStream && activeDirectSource ? (
          <HlsDirectPlayer
            key={`direct-${activeDirectSource.url}-${id}`}
            src={activeDirectSource.url}
            poster={directStreamEntry?.poster || mediaDetails?.backdrop_url || mediaDetails?.poster_url}
            title={mediaDetails?.title}
            captions={directStreamEntry?.captions || []}
            initialTime={initialSavedProgress}
            onTimeUpdate={(curr, dur) => {
              const now = Date.now();
              if (now - lastSaveTimeRef.current > 8000) {
                lastSaveTimeRef.current = now;
                if (dur > 0 && curr > 0) {
                  useAppStore.getState().saveProgress(id, curr, dur, buildProgressItem());
                }
              }
            }}
            onEnded={() => {
              if (isTV) setCountdown(10);
            }}
            onError={() => {
              setUseDirectStream(false);
            }}
          />
        ) : (
          <>
            {/* Loading Spinner Overlay */}
            {isIframeLoading && (
              <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-900/90 text-center backdrop-blur-sm">
                <div className="relative mb-4 flex h-14 w-14 items-center justify-center">
                  <span className="absolute inset-0 animate-spin rounded-full border-4 border-neon-purple/20 border-t-neon-purple" />
                  <span className="absolute inset-2 animate-[spin_1.2s_linear_infinite_reverse] rounded-full border-4 border-neon-cyan/20 border-b-neon-cyan" />
                  <LoaderCircle className="h-6 w-6 animate-pulse text-neon-cyan" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-white">
                  Connecting to {activeServer.name}...
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Loading {mediaDetails?.title || 'Movie'} • Press S to switch server
                </p>
              </div>
            )}

            {/* Embedded Streaming Frame playing the exact requested movie */}
            <iframe
              key={`embed-${activeServer.id}-${id}-${currentSeason}-${currentEpisode}`}
              src={embedUrl}
              title={mediaDetails?.title || 'Movie Player'}
              className="h-full w-full border-0 bg-black"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
              allowFullScreen
              referrerPolicy="origin"
              onLoad={() => setIsIframeLoading(false)}
            />
          </>
        )}
      </div>

      {/* 3. TV SERIES EPISODES DRAWER */}
      <AnimatePresence>
        {showEpisodesDrawer && isTV && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.25 }}
            className="glass-panel-glow absolute bottom-4 right-4 top-20 z-50 flex w-[min(26rem,calc(100vw-2rem))] flex-col rounded-3xl bg-space-900/95 p-5 shadow-2xl backdrop-blur-2xl border border-white/15"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-neon-purple">
                  <Tv className="h-4 w-4" /> Season {currentSeason} Episodes
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {mediaDetails?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEpisodesDrawer(false)}
                className="rounded-xl bg-white/5 p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Episode Quick Switch Controls (Prev / Next) */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                disabled={!prevEpisodeNumber}
                onClick={loadPrevEpisode}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-gray-200 transition-all disabled:opacity-40 hover:enabled:border-neon-cyan/50 hover:enabled:bg-neon-cyan/10"
              >
                <ChevronLeft className="h-4 w-4" /> Prev Ep
              </button>
              <button
                type="button"
                disabled={!nextEpisodeNumber}
                onClick={loadNextEpisode}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl btn-neon-purple py-2 text-xs font-bold text-white transition-all disabled:opacity-40"
              >
                Next Ep <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Episode List */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1 no-scrollbar">
              {seasonEpisodes?.length ? (
                seasonEpisodes.map((episode) => {
                  const isCurrent = episode.episode_number === currentEpisode;
                  return (
                    <button
                      key={episode.episode_number}
                      type="button"
                      onClick={() => loadEpisode(currentSeason, episode.episode_number)}
                      className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-all ${
                        isCurrent
                          ? 'border border-neon-purple bg-neon-purple/20 text-white shadow-[0_0_15px_rgba(124,58,237,0.25)]'
                          : 'border border-transparent bg-white/5 text-gray-300 hover:border-white/15 hover:bg-white/10'
                      }`}
                    >
                      <div className="relative flex-shrink-0 w-16 aspect-video rounded-lg overflow-hidden bg-black/40">
                        {episode.still_path ? (
                          <img
                            src={episode.still_path}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-black text-neon-cyan">
                            E{episode.episode_number}
                          </div>
                        )}
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[8px] font-black text-neon-cyan">
                          E{episode.episode_number}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="truncate text-xs font-bold text-white">
                            {episode.name || `Episode ${episode.episode_number}`}
                          </h3>
                          {isCurrent && (
                            <span className="flex-shrink-0 rounded bg-neon-purple/40 px-1.5 py-0.5 text-[8px] font-black text-neon-cyan uppercase">
                              Playing
                            </span>
                          )}
                        </div>
                        {episode.overview && (
                          <p className="mt-1 line-clamp-2 text-[10px] text-gray-400 font-light">
                            {episode.overview}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                  <Film className="h-8 w-8 mb-2 opacity-50 text-neon-cyan" />
                  <p className="text-xs font-bold">Standard TV Series Episode Structure</p>
                  <p className="text-[10px] mt-1">Episodes can also be navigated with Prev/Next buttons above.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. NEXT EPISODE AUTOPLAY COUNTDOWN MODAL */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6 text-center backdrop-blur-md"
          >
            <div className="glass-panel-glow max-w-md rounded-3xl p-8 border border-white/20">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-neon-cyan">
                Up Next • Season {currentSeason}
              </p>
              <h2 className="my-2 text-2xl font-black text-white">
                Episode {nextEpisodeNumber}
              </h2>
              <div className="my-6 text-7xl font-black text-neon-purple drop-shadow-[0_0_20px_rgba(124,58,237,0.8)]">
                {countdown}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={loadNextEpisode}
                  className="btn-neon-purple flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-neon-purple/40"
                >
                  Play Now <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCountdown(null)}
                  className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
