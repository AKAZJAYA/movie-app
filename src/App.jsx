import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';

// Pages
import Home from './pages/Home';
import Search from './pages/Search';
import Details from './pages/Details';
import Watchlist from './pages/Watchlist';
import StreamingPlayer from './pages/StreamingPlayer';

// Components
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AnimatedAppContent() {
  const location = useLocation();
  
  // Hide Navbar/BottomNav if we are currently inside the fullscreen Streaming Player
  const isPlayerRoute = location.pathname.startsWith('/player');

  return (
    <div className="relative min-h-screen bg-space-900 text-white selection:bg-neon-purple/50 overflow-x-hidden">
      {/* Absolute Ambient Cyber Glow Blobs */}
      <div className="ambient-glow bg-neon-purple left-[-10%] top-[5%] w-[400px] h-[400px] md:w-[600px] md:h-[600px]" />
      <div className="ambient-glow bg-neon-cyan right-[-5%] top-[40%] w-[350px] h-[350px] md:w-[550px] md:h-[550px] opacity-10" />
      <div className="ambient-glow bg-neon-pink left-[20%] bottom-[10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] opacity-5" />

      {!isPlayerRoute && <Navbar />}

      {/* Main Page Content Wrapper with Global Transitions */}
      <main className={`relative z-10 pb-24 md:pb-8 ${!isPlayerRoute ? 'pt-20 md:pt-24' : ''}`}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route 
              path="/" 
              element={
                <PageWrapper>
                  <Home />
                </PageWrapper>
              } 
            />
            <Route 
              path="/search" 
              element={
                <PageWrapper>
                  <Search />
                </PageWrapper>
              } 
            />
            <Route 
              path="/watchlist" 
              element={
                <PageWrapper>
                  <Watchlist />
                </PageWrapper>
              } 
            />
            <Route 
              path="/details/:type/:id" 
              element={
                <PageWrapper>
                  <Details />
                </PageWrapper>
              } 
            />
            <Route 
              path="/player/:type/:id" 
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="w-full h-screen bg-black"
                >
                  <StreamingPlayer />
                </motion.div>
              } 
            />
          </Routes>
        </AnimatePresence>
      </main>

      {!isPlayerRoute && <BottomNav />}
    </div>
  );
}

// Global page animation helper wrapper
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AnimatedAppContent />
      </Router>
    </QueryClientProvider>
  );
}
