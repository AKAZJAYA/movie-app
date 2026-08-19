import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';

export default function MovieRow({ title, items = [], isLoading = false }) {
  const rowRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Check scroll position to dynamically show/hide arrows
  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 10);
      // scrollWidth is total scrollable content, clientWidth is visible content
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items, isLoading]);

  const handleScroll = (direction) => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      // Scroll by 75% of the visible container width
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      
      rowRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
      
      // Delay check slightly to let smooth scrolling complete
      setTimeout(checkScroll, 400);
    }
  };

  return (
    <div className="relative my-8 group/row max-w-7xl mx-auto px-4 md:px-8 select-none">
      {/* Row Title with sci-fi indicator tag */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-neon-purple to-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
        <h2 className="text-lg md:text-xl font-bold tracking-wider text-white">
          {title}
        </h2>
      </div>

      <div className="relative">
        {/* Left Scroll Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-2 top-[40%] -translate-y-[40%] z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full glass-panel bg-space-900/60 border border-white/10 text-white hover:border-neon-cyan hover:bg-neon-cyan/15 hover:shadow-neon-cyan/25 hover:shadow-md transition-all duration-300 opacity-0 group-hover/row:opacity-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Right Scroll Arrow */}
        {showRightArrow && (
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-2 top-[40%] -translate-y-[40%] z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full glass-panel bg-space-900/60 border border-white/10 text-white hover:border-neon-purple hover:bg-neon-purple/15 hover:shadow-neon-purple/25 hover:shadow-md transition-all duration-300 opacity-0 group-hover/row:opacity-100"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Horizontal Card Row List */}
        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth px-1 py-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {isLoading ? (
            // Shimmering Card Skeletons
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="relative flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] aspect-[2/3] rounded-2xl overflow-hidden bg-space-800/80 border border-white/5"
              >
                <div className="absolute inset-0 shimmer" />
                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                  <div className="w-2/3 h-3 bg-white/10 rounded" />
                  <div className="w-1/3 h-3 bg-white/10 rounded" />
                </div>
              </div>
            ))
          ) : items.length > 0 ? (
            items.map((item) => (
              <MovieCard key={item.id} item={item} />
            ))
          ) : (
            // Empty placeholder
            <div className="w-full py-8 text-center text-gray-500 font-medium border border-dashed border-white/10 rounded-2xl glass-panel">
              No content found in this quadrant.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
