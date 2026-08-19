import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  Check,
  RotateCcw,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Dynamically load Hls.js from CDN if window.Hls is not available
const loadHlsScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Hls) {
      resolve(window.Hls);
      return;
    }
    const existingScript = document.getElementById('hls-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Hls));
      existingScript.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'hls-script';
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
    script.async = true;
    script.onload = () => resolve(window.Hls);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function HlsDirectPlayer({
  src,
  poster,
  title,
  captions = [],
  initialTime = 0,
  onTimeUpdate,
  onEnded,
  onError,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [levels, setLevels] = useState([]); // [{ height, bitrate, index }]
  const [selectedLevel, setSelectedLevel] = useState(-1); // -1 is Auto
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Initialize Video & HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let isSubscribed = true;
    setIsBuffering(true);

    const isHlsUrl = src.includes('.m3u8') || src.startsWith('blob:');

    loadHlsScript()
      .then((Hls) => {
        if (!isSubscribed) return;

        if (Hls && Hls.isSupported() && isHlsUrl) {
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            startLevel: -1, // Auto
          });

          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            if (!isSubscribed) return;
            const parsedLevels = (data.levels || []).map((lvl, index) => ({
              index,
              height: lvl.height || 0,
              bitrate: lvl.bitrate ? `${(lvl.bitrate / 1000000).toFixed(1)} Mbps` : '',
              label: lvl.height >= 2160 ? '4K Ultra HD' : lvl.height >= 1440 ? '2K QHD' : lvl.height >= 1080 ? '1080p FHD' : lvl.height ? `${lvl.height}p` : `Stream ${index + 1}`,
            }));
            setLevels(parsedLevels);
            setIsBuffering(false);

            if (initialTime > 0) {
              video.currentTime = initialTime;
            }
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
            if (hls.autoLevelEnabled) {
              // Level auto-selected by HLS
            }
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              if (onError) onError(data);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHlsUrl) {
          // Native playback (Safari iOS/Mac or direct MP4)
          video.src = src;
          if (initialTime > 0) {
            video.currentTime = initialTime;
          }
          setIsBuffering(false);
        }
      })
      .catch((err) => {
        console.warn('HLS loader error, fallback to native source', err);
        video.src = src;
        setIsBuffering(false);
      });

    return () => {
      isSubscribed = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, initialTime, onError]);

  // Controls Visibility on Mouse Move
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 3500);
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = Math.max(0, Math.min(duration, pos * duration));
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleLevelChange = (index) => {
    setSelectedLevel(index);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    }
    setShowSettings(false);
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettings(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black text-white select-none"
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className="h-full w-full object-contain bg-black cursor-pointer"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onTimeUpdate={() => {
          if (videoRef.current) {
            const cur = videoRef.current.currentTime;
            setCurrentTime(cur);
            if (onTimeUpdate) onTimeUpdate(cur, videoRef.current.duration);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            videoRef.current.volume = volume;
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        }}
      >
        {captions.map((c, i) => (
          <track
            key={i}
            kind="subtitles"
            src={c.src}
            srcLang={c.srclang || 'en'}
            label={c.label || 'English'}
            default={c.default}
          />
        ))}
      </video>

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neon-purple/20 border-t-neon-cyan" />
          <span className="mt-3 text-xs font-black uppercase tracking-widest text-neon-cyan animate-pulse">
            Buffering HD Stream...
          </span>
        </div>
      )}

      {/* Large Center Play/Pause Indicator on Toggle */}
      {!isPlaying && !isBuffering && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-neon-purple/80 text-white shadow-[0_0_30px_rgba(124,58,237,0.6)] backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
        >
          <Play className="h-9 w-9 fill-white translate-x-0.5" />
        </button>
      )}

      {/* Modern Player HUD Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 z-30 flex flex-col bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 md:px-8 md:py-6"
          >
            {/* Progress Seek Bar */}
            <div
              onClick={handleSeek}
              className="group relative mb-3 flex h-3 w-full cursor-pointer items-center"
            >
              <div className="h-1.5 w-full rounded-full bg-white/20 transition-all group-hover:h-2">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan shadow-[0_0_10px_#7c3aed]"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <span className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 scale-0 rounded-full bg-white shadow-md transition-transform group-hover:scale-100" />
                </div>
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between gap-4">
              {/* Left Actions: Play/Pause, Volume, Time */}
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="text-white hover:text-neon-cyan transition-colors"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
                </button>

                {/* Volume slider & mute */}
                <div className="flex items-center gap-2 group">
                  <button type="button" onClick={toggleMute} className="text-gray-300 hover:text-white">
                    {isMuted || volume === 0 ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 md:w-20 accent-neon-cyan cursor-pointer h-1.5 rounded-lg bg-white/20"
                  />
                </div>

                {/* Time Display */}
                <span className="text-xs font-mono font-bold text-gray-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right Actions: Quality Badge, Settings, Fullscreen */}
              <div className="flex items-center gap-2 md:gap-3">
                {/* Active Quality Badge */}
                <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 px-2.5 py-1 text-[10px] font-black uppercase text-neon-cyan">
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {selectedLevel === -1
                      ? 'Adaptive Auto HD'
                      : levels[selectedLevel]?.label || 'Direct HD'}
                  </span>
                </div>

                {/* Settings Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSettings((s) => !s)}
                    className="rounded-xl p-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                    title="Playback Quality & Speed"
                  >
                    <Settings className="h-5 w-5" />
                  </button>

                  {/* Settings Modal */}
                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="glass-panel-glow absolute bottom-12 right-0 w-64 rounded-2xl bg-space-900/95 p-3.5 shadow-2xl border border-white/15 backdrop-blur-xl"
                      >
                        {/* Quality Options */}
                        <div className="mb-3">
                          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neon-cyan">
                            <Gauge className="h-3.5 w-3.5" /> Video Quality
                          </h4>
                          <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                            <button
                              type="button"
                              onClick={() => handleLevelChange(-1)}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                                selectedLevel === -1
                                  ? 'bg-neon-purple/30 text-white border border-neon-purple'
                                  : 'text-gray-300 hover:bg-white/5'
                              }`}
                            >
                              <span>Auto (Adaptive 1080p/4K)</span>
                              {selectedLevel === -1 && <Check className="h-3.5 w-3.5 text-neon-cyan" />}
                            </button>
                            {levels.map((lvl) => (
                              <button
                                key={lvl.index}
                                type="button"
                                onClick={() => handleLevelChange(lvl.index)}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                                  selectedLevel === lvl.index
                                    ? 'bg-neon-purple/30 text-white border border-neon-purple'
                                    : 'text-gray-300 hover:bg-white/5'
                                }`}
                              >
                                <span>{lvl.label} {lvl.bitrate ? `(${lvl.bitrate})` : ''}</span>
                                {selectedLevel === lvl.index && <Check className="h-3.5 w-3.5 text-neon-cyan" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Speed Options */}
                        <div className="border-t border-white/10 pt-2.5">
                          <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-neon-purple">
                            Speed
                          </h4>
                          <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
                            {[0.75, 1, 1.25, 1.5].map((rate) => (
                              <button
                                key={rate}
                                type="button"
                                onClick={() => handleSpeedChange(rate)}
                                className={`rounded-lg py-1 transition-all ${
                                  playbackRate === rate
                                    ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                }`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="rounded-xl p-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
