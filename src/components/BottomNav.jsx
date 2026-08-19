import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Search, Bookmark } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home', icon: Compass },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/watchlist', label: 'Watchlist', icon: Bookmark },
  ];

  return (
    <div className="fixed bottom-5 left-4 right-4 z-50 md:hidden flex items-center justify-center">
      <nav className="w-full max-w-sm glass-panel bg-space-900/70 border border-white/10 rounded-2xl px-6 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.6),0_1px_15px_rgba(6,182,212,0.1)] flex items-center justify-around">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;

          return (
            <Link
              key={link.path}
              to={link.path}
              className="relative flex flex-col items-center justify-center py-1 px-3 text-center group"
            >
              {/* Dynamic Animated Glow Circle behind active icon */}
              {isActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute inset-0 bg-gradient-to-t from-neon-purple/15 to-neon-cyan/15 rounded-xl border border-neon-cyan/20 -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}

              <motion.div
                animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={`flex items-center justify-center ${isActive ? 'text-neon-cyan' : 'text-gray-400'}`}
              >
                <Icon className="w-5.5 h-5.5" />
              </motion.div>

              <span className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${isActive ? 'text-white' : 'text-gray-500'}`}>
                {link.label}
              </span>

              {/* Little cyan neon status bar under the active mobile item */}
              {isActive && (
                <span className="absolute bottom-0 w-3 h-[2px] rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
