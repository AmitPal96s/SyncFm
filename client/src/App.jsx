import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Room from './pages/Room';
import Profile from './pages/Profile';
import PrivateRoute from './components/PrivateRoute';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import LoadingScreen from './components/LoadingScreen';
import PageTransition from './components/PageTransition';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Loading Lifecycle
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000); // 2.5s progress + 0.5s buffer
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Intercept OAuth Tokens from URL hash
    const hash = window.location.hash;
    
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const state = params.get("state") || "";

      if (accessToken) {
        if (state.startsWith("spotify")) {
          window.localStorage.setItem("spotify_token", accessToken);
        } else if (state.startsWith("youtube")) {
          window.localStorage.setItem("youtube_token", accessToken);
        }
        window.location.hash = "";

        const codePart = state.split("_")[1];
        if (codePart) {
          navigate(`/room/${codePart}`, { replace: true });
        }
      }
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      <Toaster position="top-right" />
      <LoadingScreen isLoading={isLoading} />
      
      <div className="relative z-10 w-full h-full min-h-screen">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <PageTransition>
                <Landing />
              </PageTransition>
            } />
            <Route path="/room/:code" element={
              <PageTransition>
                <Room />
              </PageTransition>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <PageTransition>
                  <Profile />
                </PageTransition>
              </PrivateRoute>
            } />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
