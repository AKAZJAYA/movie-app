import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, Search, Bookmark, Compass, Bell } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { path: '/', label: 'Home', icon: Compass },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/watchlist', label: 'Watchlist', icon: Bookmark },
  ];

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 px-4 md:px-8 ${
        isScrolled 
          ? 'py-3 bg-space-900/80 backdrop-blur-md border-b border-neon-purple/20 shadow-[0_4px_30px_rgba(0,0,0,0.5),0_1px_15px_rgba(124,58,237,0.1)]' 
          : 'py-6 bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo with Glow */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-neon-purple to-neon-cyan p-[2px] shadow-neon-purple/25 shadow-md group-hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-center w-full h-full rounded-[10px] bg-space-900">
              <Film className="w-5 h-5 text-neon-cyan group-hover:text-neon-purple transition-colors duration-300" />
            </div>
            {/* Absolute dot for sci-fi HUD accent */}
            <span className="absolute top-[2px] right-[2px] w-[5px] h-[5px] rounded-full bg-neon-cyan animate-ping" />
          </div>
          
          <span className="text-xl md:text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-neon-cyan group-hover:to-neon-purple transition-all duration-500">
            NEBULA<span className="text-neon-purple font-black">FLIX</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 bg-white/5 border border-white/5 px-6 py-2 rounded-full backdrop-blur-xl">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative flex items-center gap-2 text-sm font-medium transition-all duration-300 px-3 py-1 rounded-full ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
                
                {isActive && (
                  <motion.span
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/30 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User / Actions Hub */}
        <div className="flex items-center gap-4">
          {/* Neon search shortcut button (only shows on desktop, links to Search) */}
          <Link 
            to="/search" 
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/5 hover:border-neon-cyan hover:bg-neon-cyan/10 text-gray-300 hover:text-neon-cyan transition-all duration-300"
          >
            <Search className="w-4.5 h-4.5" />
          </Link>

          {/* Simulated Notifications */}
          <button className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/5 hover:border-neon-purple hover:bg-neon-purple/10 text-gray-300 hover:text-neon-purple transition-all duration-300">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-[2px] right-[2px] w-[7px] h-[7px] rounded-full bg-neon-pink shadow-neon-pink animate-pulse" />
          </button>

          {/* User Profile Avatar with Cybernetic status border */}
          <div className="flex items-center gap-3 pl-2 border-l border-white/10">
            <div className="relative w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-b from-neon-cyan to-neon-purple shadow-[0_0_10px_rgba(6,182,212,0.15)] hover:shadow-neon-cyan hover:scale-105 transition-all duration-300 cursor-pointer">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" 
                alt="Cyber User Profile" 
                className="w-full h-full rounded-full object-cover"
              />
              {/* Online pulse dot */}
              <span className="absolute bottom-0 right-0 w-[8px] h-[8px] rounded-full bg-green-500 border border-space-900 shadow-md shadow-green-500/50 animate-pulse" />
            </div>
            <span className="hidden lg:block text-xs font-semibold text-gray-300 tracking-wider">NET_PILOT_01</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
