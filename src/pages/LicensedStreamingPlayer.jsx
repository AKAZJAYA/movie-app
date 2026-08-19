import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  ExternalLink,
  Gauge,
  Layers,
  LoaderCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import useAppStore from '../store/useAppStore';
import { getMediaDetails, getTVSeasonEpisodes } from '../utils/api';
import { getStreamEntry, isHlsSource } from '../utils/streamCatalog';

const parsePositiveInteger = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toYouTubeWatchUrl = (embedUrl) => {
  if (!embedUrl) return null;
  const videoId = embedUrl.match(/(?:embed\/|youtu\.be\/|v=)([\w-]{6,})/)?.[1];
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : embedUrl;
};

const mediaErrorMessage = (error) => {
  if (!error) return 'The configured stream could not be played.';
  if (error.code === MediaError.MEDIA_ERR_ABORTED) return 'Playback was stopped before the stream loaded.';
  if (error.code === MediaError.MEDIA_ERR_NETWORK) return 'The video host returned a network error.';
  if (error.code === MediaError.MEDIA_ERR_DECODE) return 'This browser could not decode the selected rendition.';
  if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return 'This rendition or codec is not supported by the browser.';
  }
  return 'The configured stream could not be played.';
};

export default function LicensedStreamingPlayer() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { playbackProgress, preferences, saveProgress, setPreference } = useAppStore();

  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const currentSeason = parsePositiveInteger(seasonParam);
  const currentEpisode = parsePositiveInteger(episodeParam);
  const [selectedSourceLabel, setSelectedSourceLabel] = useState(() => preferences.quality || 'Auto');
  const [isLoading, setIsLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const videoRef = useRef(null);
  const pendingRestoreRef = useRef(null);
  const lastProgressSaveRef = useRef(0);

  const { data: mediaDetails } = useQuery({
    queryKey: ['mediaDetails', type, id],
    queryFn: () => getMediaDetails(type || 'movie', id),
    staleTime: 1000 * 60 * 30,
  });

  const isTV = type === 'tv' || mediaDetails?.type === 'tv';
  const { data: seasonEpisodes } = useQuery({
    queryKey: ['tvSeasonEpisodes', id, currentSeason],
    queryFn: () => getTVSeasonEpisodes(id, currentSeason),
    enabled: isTV && Boolean(id),
    staleTime: 1000 * 60 * 30,
  });

  const {
    data: streamEntry,
    isLoading: isCatalogLoading,
    error: streamCatalogError,
  } = useQuery({
    queryKey: ['streamEntry', isTV ? 'tv' : 'movie', id, currentSeason, currentEpisode],
    queryFn: ({ signal }) => getStreamEntry({
      type: isTV ? 'tv' : 'movie',
      id,
      season: currentSeason,
      episode: currentEpisode,
      signal,
    }),
    retry: false,
  });

  const preferredSourceIndex = streamEntry?.sources?.findIndex(
    (source) => source.label === selectedSourceLabel,
  ) ?? -1;
  const activeSourceIndex = preferredSourceIndex >= 0 ? preferredSourceIndex : 0;
  const activeSource = streamEntry?.sources?.[activeSourceIndex] || null;
  const catalogStatus = isCatalogLoading
    ? 'loading'
    : streamCatalogError
      ? 'error'
      : streamEntry
        ? 'ready'
        : 'missing';
  const catalogError = streamCatalogError?.message || 'The stream catalog could not be loaded.';
  const savedProgress = playbackProgress[id]?.progress || 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return undefined;

    setIsLoading(true);
    setPlaybackError('');
    video.src = activeSource.url;
    video.load();

    return () => video.pause();
  }, [activeSource]);

  const buildProgressItem = useCallback(() => ({
    id,
    title: mediaDetails?.title || streamEntry?.title || `Media ${id}`,
    type: isTV ? 'tv' : 'movie',
    poster_url: mediaDetails?.poster_url,
    backdrop_url: mediaDetails?.backdrop_url,
    year: mediaDetails?.year,
    rating: mediaDetails?.rating,
    quality: activeSource?.label || 'Source quality',
    ...(isTV ? { season: currentSeason, episode: currentEpisode } : {}),
  }), [
    id,
    mediaDetails,
    streamEntry?.title,
    isTV,
    activeSource?.label,
    currentSeason,
    currentEpisode,
  ]);

  const persistProgress = useCallback((force = false) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const now = Date.now();
    if (!force && now - lastProgressSaveRef.current < 5000) return;
    lastProgressSaveRef.current = now;
    saveProgress(id, video.currentTime, video.duration, buildProgressItem());
  }, [id, saveProgress, buildProgressItem]);

  const nextEpisodeNumber = useMemo(() => {
    if (!isTV) return null;
    if (!seasonEpisodes) return currentEpisode + 1;
    return seasonEpisodes.find((episode) => episode.episode_number > currentEpisode)?.episode_number || null;
  }, [isTV, seasonEpisodes, currentEpisode]);

  const loadEpisode = useCallback((season, episode) => {
    persistProgress(true);
    setCountdown(null);
    setShowEpisodes(false);
    setSearchParams({ season: String(season), episode: String(episode) });
  }, [persistProgress, setSearchParams]);

  const loadNextEpisode = useCallback(() => {
    if (nextEpisodeNumber) loadEpisode(currentSeason, nextEpisodeNumber);
  }, [nextEpisodeNumber, currentSeason, loadEpisode]);

  useEffect(() => {
    if (countdown === null) return undefined;
    const timer = window.setTimeout(() => {
      if (countdown <= 1) loadNextEpisode();
      else setCountdown((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, loadNextEpisode]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') navigate(`/details/${type || 'movie'}/${id}`);
      if (event.key.toLowerCase() === 'q') setShowSettings((shown) => !shown);
      if (event.key.toLowerCase() === 'n' && nextEpisodeNumber) loadNextEpisode();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, type, id, nextEpisodeNumber, loadNextEpisode]);

  useEffect(() => () => persistProgress(true), [persistProgress]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = Math.min(1, Math.max(0, preferences.volume ?? 0.8));
    const pendingRestore = pendingRestoreRef.current;
    const restoreTime = pendingRestore?.time ?? savedProgress;
    if (restoreTime > 0 && restoreTime < video.duration - 10) video.currentTime = restoreTime;

    setIsLoading(false);
    pendingRestoreRef.current = null;
    if (pendingRestore?.wasPlaying) video.play().catch(() => {});
  };

  const handleSourceChange = (index) => {
    if (index === activeSourceIndex) return;
    const video = videoRef.current;
    pendingRestoreRef.current = {
      time: video?.currentTime || 0,
      wasPlaying: video ? !video.paused : false,
    };
    persistProgress(true);
    setSelectedSourceLabel(streamEntry.sources[index].label);
    setPreference('quality', streamEntry.sources[index].label);
    setShowSettings(false);
  };

  const handleRetry = () => {
    const video = videoRef.current;
    if (!video) return;
    setPlaybackError('');
    setIsLoading(true);
    video.load();
    video.play().catch(() => {});
  };

  const handleEnded = () => {
    persistProgress(true);
    if (isTV && nextEpisodeNumber && preferences.autoplayNext) setCountdown(10);
  };

  const handleBack = () => {
    persistProgress(true);
    navigate(`/details/${type || 'movie'}/${id}`);
  };

  const trailerUrl = toYouTubeWatchUrl(mediaDetails?.trailer_url);
  const legalSearchUrl = mediaDetails?.watch_provider_link
    || `https://www.justwatch.com/us/search?q=${encodeURIComponent(mediaDetails?.title || id)}`;
  const isNativeHls = activeSource && isHlsSource(activeSource);

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black text-white">
      {catalogStatus === 'ready' && activeSource && (
        <video
          ref={videoRef}
          className="h-full w-full bg-black object-contain"
          controls
          playsInline
          preload="metadata"
          poster={streamEntry.poster || mediaDetails?.backdrop_url || mediaDetails?.poster_url}
          onLoadStart={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={() => persistProgress(false)}
          onPause={() => persistProgress(true)}
          onEnded={handleEnded}
          onError={(event) => {
            setIsLoading(false);
            setPlaybackError(mediaErrorMessage(event.currentTarget.error));
          }}
        >
          {streamEntry.captions.map((caption) => (
            <track
              key={`${caption.src}-${caption.srclang}`}
              kind="subtitles"
              src={caption.src}
              srcLang={caption.srclang}
              label={caption.label || caption.srclang}
              default={Boolean(caption.default)}
            />
          ))}
          Your browser does not support HTML video.
        </video>
      )}

      {(catalogStatus === 'loading' || (catalogStatus === 'ready' && isLoading)) && !playbackError && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-900/90 text-center">
          <LoaderCircle className="mb-4 h-12 w-12 animate-spin text-neon-cyan" />
          <p className="text-sm font-black uppercase tracking-[0.25em] text-white">
            {catalogStatus === 'loading' ? 'Checking licensed sources' : 'Loading video'}
          </p>
        </div>
      )}

      {(catalogStatus === 'missing' || catalogStatus === 'error') && (
        <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-space-900 p-6">
          <div className="glass-panel-glow w-full max-w-2xl rounded-3xl p-7 text-center sm:p-10">
            <ShieldCheck className="mx-auto mb-5 h-12 w-12 text-neon-cyan" />
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-neon-cyan">
              Licensed playback only
            </p>
            <h1 className="mb-3 text-2xl font-black sm:text-3xl">
              {mediaDetails?.title || 'This title'} has no configured stream
            </h1>
            <p className="mx-auto mb-7 max-w-xl text-sm leading-6 text-gray-300">
              Movie metadata APIs do not include the movie file. Add a source you own or are licensed to use
              to <code className="rounded bg-white/10 px-1.5 py-0.5 text-neon-cyan">public/streams.json</code>.
              Quality choices appear only when that source really provides those renditions.
            </p>
            {catalogStatus === 'error' && (
              <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200">
                {catalogError}
              </p>
            )}
            {mediaDetails?.watch_providers?.length > 0 && (
              <div className="mb-6 flex flex-wrap justify-center gap-2">
                {mediaDetails.watch_providers.slice(0, 8).map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 pr-3 text-left"
                  >
                    {provider.logo_url && (
                      <img src={provider.logo_url} alt="" className="h-8 w-8 rounded-lg" />
                    )}
                    <span>
                      <span className="block text-xs font-bold text-white">{provider.name}</span>
                      <span className="block text-[9px] uppercase text-gray-500">
                        {provider.methods.join(' • ')}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              {trailerUrl && (
                <a
                  href={trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-neon-purple flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
                >
                  Watch official trailer <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <a
                href={legalSearchUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold hover:border-neon-cyan/50"
              >
                View current legal offers <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            {mediaDetails?.watch_providers?.length > 0 && (
              <p className="mt-4 text-[9px] text-gray-500">
                Availability data powered by JustWatch via TMDB. Provider video quality depends on your plan and device.
              </p>
            )}
          </div>
        </div>
      )}

      {playbackError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-6 text-center">
          <div className="max-w-lg rounded-3xl border border-red-400/30 bg-space-900 p-8">
            <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-red-300" />
            <h2 className="mb-2 text-xl font-black">Playback failed</h2>
            <p className="mb-6 text-sm text-gray-300">{playbackError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="btn-neon-purple mx-auto flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
            >
              <RefreshCw className="h-4 w-4" /> Retry once
            </button>
          </div>
        </div>
      )}

      <div className="absolute left-4 top-4 z-40 flex flex-wrap items-center gap-2 sm:left-6 sm:top-6">
        <button
          type="button"
          onClick={handleBack}
          className="glass-panel flex items-center gap-2 rounded-xl bg-black/65 px-4 py-2 text-xs font-bold text-gray-200 hover:border-neon-purple"
        >
          <ArrowLeft className="h-4 w-4" /> Exit
        </button>

        {isTV && (
          <button
            type="button"
            onClick={() => setShowEpisodes((shown) => !shown)}
            className="glass-panel flex items-center gap-2 rounded-xl bg-black/65 px-4 py-2 text-xs font-bold text-gray-200 hover:border-neon-purple"
          >
            <Layers className="h-4 w-4 text-neon-purple" /> S{currentSeason}:E{currentEpisode}
          </button>
        )}
      </div>

      {catalogStatus === 'ready' && activeSource && (
        <div className="absolute right-4 top-4 z-40 flex items-center gap-2 sm:right-6 sm:top-6">
          <div className="glass-panel hidden items-center gap-2 rounded-xl bg-black/65 px-3 py-2 text-[10px] font-black uppercase text-neon-cyan sm:flex">
            <Check className="h-3.5 w-3.5" /> {activeSource.label}
          </div>
          <button
            type="button"
            onClick={() => setShowSettings((shown) => !shown)}
            className="glass-panel flex h-9 w-9 items-center justify-center rounded-xl bg-black/65 text-gray-200 hover:border-neon-cyan hover:text-neon-cyan"
            title="Quality settings (Q)"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {showSettings && streamEntry && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel-glow absolute right-4 top-16 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-space-900/95 p-4 sm:right-6 sm:top-20"
          >
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neon-cyan">
                <Gauge className="h-4 w-4" /> Available quality
              </h2>
              <span className="text-[10px] text-gray-500">Q to close</span>
            </div>
            <div className="space-y-2">
              {streamEntry.sources.map((source, index) => (
                <button
                  key={`${source.label}-${source.url}`}
                  type="button"
                  onClick={() => handleSourceChange(index)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                    index === activeSourceIndex
                      ? 'border-neon-purple bg-neon-purple/20 text-white'
                      : 'border-transparent bg-white/5 text-gray-300 hover:border-white/15'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold">{source.label}</span>
                    <span className="block text-[10px] text-gray-500">
                      {source.bitrate ? `${source.bitrate} • ` : ''}
                      {isHlsSource(source) ? 'Adaptive HLS' : source.type || 'Video'}
                    </span>
                  </span>
                  {index === activeSourceIndex && <Check className="h-4 w-4 text-neon-cyan" />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-4 text-gray-500">
              {isNativeHls
                ? 'This browser controls the variants inside this HLS master. List variant manifests separately in streams.json to expose manual choices.'
                : 'Switching renditions keeps your current playback position.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEpisodes && isTV && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-panel-glow absolute left-4 top-16 z-40 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-space-900/95 p-4 sm:left-6 sm:top-20"
          >
            <h2 className="mb-3 border-b border-white/10 pb-3 text-xs font-black uppercase tracking-wider text-neon-purple">
              Season {currentSeason}
            </h2>
            <div className="space-y-2">
              {seasonEpisodes?.length ? seasonEpisodes.map((episode) => (
                <button
                  key={episode.episode_number}
                  type="button"
                  onClick={() => loadEpisode(currentSeason, episode.episode_number)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${
                    episode.episode_number === currentEpisode
                      ? 'bg-neon-purple/20 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 text-xs font-black text-neon-cyan">
                    {episode.episode_number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">
                    {episode.name || episode.title || `Episode ${episode.episode_number}`}
                  </span>
                </button>
              )) : (
                <p className="p-4 text-center text-xs text-gray-500">No episode metadata available.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6 text-center"
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-neon-cyan">Next episode</p>
              <div className="my-5 text-6xl font-black">{countdown}</div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={loadNextEpisode}
                  className="btn-neon-purple flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
                >
                  Play now <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCountdown(null)}
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold"
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
