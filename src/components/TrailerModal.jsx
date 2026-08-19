import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function TrailerModal({ isOpen, onClose, trailerUrl, movieTitle }) {
  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Disable background scrolling when modal is active
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Extract YouTube ID
  const ytVideoId = trailerUrl?.split('/').pop() || 'Way9Dexny3w';
  const embedUrl = `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&mute=0&rel=0&controls=1`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Blur Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Video Container Chassis */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden glass-panel-glow border border-neon-purple/40 shadow-neon-glow z-10"
        >
          {/* Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-20 pointer-events-none">
            <span className="text-sm font-bold tracking-wider text-white select-none drop-shadow">
              PREVIEW: {movieTitle?.toUpperCase()}
            </span>
            <button
              onClick={onClose}
              className="pointer-events-auto flex items-center justify-center w-8 h-8 rounded-full bg-black/40 hover:bg-neon-pink/20 hover:text-neon-pink border border-white/10 hover:border-neon-pink/40 transition-all duration-300"
              title="Close Trailer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Iframe player */}
          <iframe
            src={embedUrl}
            title={`${movieTitle} Official Trailer`}
            className="w-full h-full object-cover pt-0 border-0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
