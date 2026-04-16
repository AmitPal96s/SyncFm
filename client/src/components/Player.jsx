import { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  SkipBack, 
  Pause, 
  Play, 
  SkipForward, 
  Radio, 
  Shuffle, 
  Repeat 
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import EqualizerBars from './EqualizerBars';

export default function Player({ roomData, code, isExpanded, setIsExpanded, onQueueUpdate, isAdmin }) {
  const socket = useSocket();
  const shouldReduceMotion = useReducedMotion();
  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const spotifyPlayerRef = useRef(null);

  const [queue, setQueue] = useState(roomData?.queue || []);
  const [currentIndex, setCurrentIndex] = useState(roomData?.currentTrackIndex || 0);
  const [isPlaying, setIsPlaying] = useState(roomData?.isPlaying || false);
  const [progress, setProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('In Sync ✅');
  const [spotifyError, setSpotifyError] = useState('');

  const currentTrack = queue[currentIndex] || {};
  const isSyncing = useRef(false);
  const progressInterval = useRef(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Sync state back upstream so Room can render the playlist
  useEffect(() => {
    if (onQueueUpdate) {
      onQueueUpdate({ queue, currentIndex, playTrack });
    }
  }, [queue, currentIndex, isPlaying]);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    const token = window.localStorage.getItem('spotify_token');
    if (!token) return;

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Sync.fm Web Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.5
      });

      player.addListener('ready', () => { setSpotifyError(''); });
      player.addListener('initialization_error', ({ message }) => { setSpotifyError(message); });
      player.addListener('authentication_error', () => { setSpotifyError('Auth Error: Needs Premium or new token.'); });
      player.addListener('account_error', () => { setSpotifyError('Requires Premium Account'); });

      player.connect();
      spotifyPlayerRef.current = player;
    };

    return () => {
      if (spotifyPlayerRef.current) spotifyPlayerRef.current.disconnect();
    };
  }, []);

  // Sync with incoming socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('sync_playback', (data) => {
      isSyncing.current = true;
      if (data.currentTrackIndex !== currentIndex) setCurrentIndex(data.currentTrackIndex);

      const track = queue[data.currentTrackIndex] || currentTrack;

      if (data.isPlaying !== isPlaying) {
        // If guest is already paused locally, some users prefer to stay paused.
        // But the requirement says 'Automatically synchronize'. 
        // We'll sync isPlaying state only on track changes or if the guest is 'Live'.
        setIsPlaying(data.isPlaying);
        playOrPauseMedia(track.type, data.isPlaying);
      }

      // Drift correction using latency compensation
      let localTime = 0;
      if ((track.type === 'mock' || track.type === 'audio' || !track.type) && audioRef.current) localTime = audioRef.current.currentTime;
      if (track.type === 'youtube' && ytPlayerRef.current) localTime = ytPlayerRef.current.getCurrentTime() || 0;

      // Compensate for network latency
      const expectedPosition = data.playbackPosition + ((Date.now() - (data.timestamp || Date.now())) / 1000);
      const drift = Math.abs(localTime - expectedPosition);

      // We only correct if drift is notable (> 1.5s), avoiding micro-stutters
      if (drift > 1.5 && data.isPlaying) {
        setSyncStatus('Syncing...');
        seekMedia(track.type, expectedPosition);
        setTimeout(() => setSyncStatus('In Sync ✅'), 1000);
      } else {
        setSyncStatus('In Sync ✅');
      }

      setProgress(expectedPosition);
      setTimeout(() => { isSyncing.current = false; }, 300);
    });

    socket.on('queue_updated', (newQueue) => {
      setQueue(newQueue);
    });

    return () => {
      socket.off('sync_playback');
      socket.off('queue_updated');
    };
  }, [socket, currentIndex, isPlaying, currentTrack, queue]);

  // Update visual progress local
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        let localTime = progress;
        if ((currentTrack.type === 'mock' || currentTrack.type === 'audio' || !currentTrack.type) && audioRef.current) localTime = audioRef.current.currentTime;
        if (currentTrack.type === 'youtube' && ytPlayerRef.current) {
          try { localTime = ytPlayerRef.current.getCurrentTime(); } catch (e) { }
        }
        if (currentTrack.type === 'spotify' && spotifyPlayerRef.current) {
          spotifyPlayerRef.current.getCurrentState().then(state => {
            if (state) setProgress(state.position / 1000);
          });
        } else {
          setProgress(localTime);
        }
      }, 500);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [isPlaying, currentTrack]);

  // Active Host Heartbeat
  useEffect(() => {
    if (!isAdmin || !socket) return;
    
    // Broadcast status every 2 seconds
    const interval = setInterval(() => {
      let localTime = progress;
      if (currentTrack?.type === 'youtube' && ytPlayerRef.current) {
        try { localTime = ytPlayerRef.current.getCurrentTime() || 0; } catch(e){}
      } else if (audioRef.current) {
        localTime = audioRef.current.currentTime;
      }
      
      socket.emit('player_update', {
        code,
        currentTrackIndex: currentIndex,
        playbackPosition: localTime,
        isPlaying
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isAdmin, socket, isPlaying, progress, currentIndex, currentTrack]);

  const broadcastUpdate = (updates) => {
    if (!isAdmin || !socket || isSyncing.current) return;

    let localTime = progress;
    if ((currentTrack.type === 'mock' || currentTrack.type === 'audio' || !currentTrack.type) && audioRef.current) localTime = audioRef.current.currentTime;
    if (currentTrack.type === 'youtube' && ytPlayerRef.current) localTime = ytPlayerRef.current.getCurrentTime() || 0;

    socket.emit('player_update', {
      code,
      currentTrackIndex: currentIndex,
      playbackPosition: localTime,
      isPlaying,
      ...updates
    });
  };

  const playOrPauseMedia = (type, state) => {
    if ((type === 'mock' || type === 'audio' || !type) && audioRef.current) {
      state ? audioRef.current.play().catch(() => { }) : audioRef.current.pause();
    }
    if (type === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
      state ? ytPlayerRef.current.playVideo() : ytPlayerRef.current.pauseVideo();
    }
    if (type === 'spotify' && spotifyPlayerRef.current) {
      state ? spotifyPlayerRef.current.resume() : spotifyPlayerRef.current.pause();
    }
  };

  const seekMedia = (type, time) => {
    if ((type === 'mock' || type === 'audio' || !type) && audioRef.current) audioRef.current.currentTime = time;
    if (type === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(time, true);
    }
    if (type === 'spotify' && spotifyPlayerRef.current) spotifyPlayerRef.current.seek(time * 1000);
  };

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    playOrPauseMedia(currentTrack?.type, nextState);
    
    // Only the host broadcasts this to the entire room
    if (isAdmin) {
      broadcastUpdate({ isPlaying: nextState });
    }
  };

  const playTrack = (index) => {
    const nextTrack = queue[index];
    if (!nextTrack) return;

    setCurrentIndex(index);
    setIsPlaying(true);
    setProgress(0);

    // Attempt seek and play if the player is already ready
    seekMedia(nextTrack.type, 0);
    playOrPauseMedia(nextTrack.type, true);

    broadcastUpdate({ currentTrackIndex: index, isPlaying: true, playbackPosition: 0 });
  };

  const nextTrack = (e) => {
    if (e) e.stopPropagation();
    const next = (currentIndex + 1) % queue.length;
    playTrack(next);
  };

  const prevTrack = (e) => {
    if (e) e.stopPropagation();
    const prev = (currentIndex - 1 + queue.length) % queue.length;
    playTrack(prev);
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    seekMedia(currentTrack.type, newTime);
    
    // Only host broadcasts seeks
    if (isAdmin) {
      broadcastUpdate({ playbackPosition: newTime });
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = ((progress / (currentTrack?.duration || 100)) * 100) || 0;

  return (
    <>
      {/* Persistent Hidden Engine Providers (must not unmount during layout swaps) */}
      <div className="fixed top-0 left-0 w-16 h-16 opacity-0 pointer-events-none z-[-50]">
        {(!currentTrack?.type || currentTrack.type === 'mock' || currentTrack.type === 'audio') && (
          <audio ref={audioRef} src={currentTrack?.audioUrl} onEnded={nextTrack} />
        )}
        {currentTrack.type === 'youtube' && currentTrack.sourceId && (
          <YouTube
            videoId={currentTrack.sourceId}
            opts={{
              width: '256',
              height: '256',
              playerVars: { autoplay: 1, controls: 0, playsinline: 1 }
            }}
            onReady={(e) => {
              ytPlayerRef.current = e.target;
              if (isPlayingRef.current) e.target.playVideo();
            }}
            onStateChange={(e) => {
              // If YouTube natively plays and we are paused, sync our state up
              if (e.data === 1 && !isPlayingRef.current) {
                setIsPlaying(true);
                broadcastUpdate({ isPlaying: true });
              }
            }}
            onError={(e) => {
              setSpotifyError('YouTube Error: Code ' + e.data + '. Video might be restricted.');
            }}
            onEnd={nextTrack}
          />
        )}
      </div>

      {!isExpanded ? (
        // ----------------------------------------------------
        // MINI PLAYER RENDER (DOCKED BOTTOM)
        // ----------------------------------------------------
        <div
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 z-50 flex flex-col cursor-pointer transition-transform duration-300"
        >
          {/* Top Progress Bar Line */}
          <div className="absolute top-0 left-0 h-0.5 bg-indigo-500 rounded-r-full pointer-events-none transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>

          <div className="flex-1 flex items-center px-4 space-x-3 w-full max-w-7xl mx-auto">
            {/* Thumb */}
            <div className="w-10 h-10 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0 relative group">
              <motion.img 
                animate={isPlaying && !shouldReduceMotion ? { rotate: 360 } : { rotate: 0 }}
                transition={isPlaying ? { duration: 10, repeat: Infinity, ease: "linear" } : { duration: 1 }}
                src={currentTrack?.albumArt} 
                className="w-full h-full object-cover" 
                alt="" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <ChevronUp size={20} className="text-white" />
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h4 className="text-sm font-semibold text-white truncate">{currentTrack?.title || 'Unknown Track'}</h4>
              <p className="text-xs text-zinc-400 truncate">{currentTrack?.artist || 'Unknown Artist'}</p>
            </div>

            {/* Sync Status Mobile Indicator */}
            {syncStatus.includes('Lag') && (
              <div className="hidden lg:flex px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-lg border border-amber-500/30">
                Lagging
              </div>
            )}

            {/* Controls */}
            {isAdmin ? (
              <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); prevTrack(); }}
                  className="hover:text-white text-zinc-300 transition-colors p-2 hidden sm:block"
                >
                  <SkipBack size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg relative z-10"
                >
                  {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-0.5" />}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                  className="hover:text-white text-zinc-300 transition-colors p-2 relative z-10"
                >
                  <SkipForward size={20} />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center space-x-3 flex-shrink-0 pr-2">
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors"
                  title="Local Play/Pause"
                >
                  {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-0.5" />}
                </button>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">Listening</span>
                  <span className="text-[8px] text-zinc-500 uppercase">Sync Enabled</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ----------------------------------------------------
        // FULL EXPANDED PLAYER RENDER
        // ----------------------------------------------------
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-2xl transition-transform duration-300 slide-up-animation">

          {/* Top Header Controls */}
          <div className="flex items-center justify-between p-4 px-6 md:px-12 w-full max-w-5xl mx-auto flex-none border-b border-white/5">
            <button onClick={() => setIsExpanded(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white">
              <ChevronDown size={24} />
            </button>
            <div className="flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold">
              <Radio size={12} className={isPlaying ? "text-green-400 animate-pulse" : "text-zinc-500"} />
              <span className={syncStatus.includes('Lag') ? "text-amber-400" : "text-zinc-300"}>{syncStatus}</span>
            </div>
          </div>

          {/* Main Expanded View */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-xl mx-auto space-y-10">

            {/* Error Warning */}
            {currentTrack.type === 'spotify' && spotifyError && (
              <div className="bg-red-500/20 text-red-300 text-xs px-3 py-2 rounded-lg text-center border border-red-500/30 w-full shadow-lg">
                {spotifyError}
              </div>
            )}

            {/* Giant Art */}
            <div className="relative w-full aspect-square max-w-[280px] md:max-w-[320px] rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 transition-transform duration-500 overflow-hidden">
              <motion.div 
                animate={isPlaying && !shouldReduceMotion ? { 
                  scale: [1, 1.05, 1],
                  rotate: 360
                } : { scale: 1, rotate: 0 }}
                transition={isPlaying ? {
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                } : { duration: 1 }}
                className="absolute inset-0"
              >
                <img src={currentTrack?.albumArt} alt="" className="w-full h-full object-cover bg-zinc-900" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent pointer-events-none"></div>
              </motion.div>
              
              {/* Overlay EQ bars */}
              <div className="absolute inset-x-0 bottom-4 flex justify-center h-12 pointer-events-none z-20">
                <EqualizerBars isPlaying={isPlaying} count={8} color="indigo" />
              </div>
            </div>

            {/* Info */}
            <div className="w-full text-center px-4">
              <h2 className="text-3xl font-bold text-white truncate shadow-black drop-shadow-lg tracking-tight">
                {currentTrack?.title || 'Unknown Track'}
              </h2>
              <p className="text-lg text-indigo-300/80 font-medium truncate mt-2 pb-2">
                {currentTrack?.artist || 'Unknown Artist'}
              </p>
            </div>

            {/* Scrubber Range */}
            <div className="w-full px-2 flex items-center space-x-4 text-xs font-medium text-zinc-400">
              <span className="w-10 text-right">{formatTime(progress)}</span>
              <div className={`flex-1 relative group/slider py-2 scale-y-100 ${!isAdmin ? 'pointer-events-none opacity-80' : ''}`}>
                <input
                  type="range"
                  min="0"
                  max={currentTrack?.duration || 100}
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all z-20 relative"
                />
                <motion.div
                  className="absolute top-2 left-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full pointer-events-none transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                  layout
                />
              </div>
              <span className="w-10 text-left">{formatTime(currentTrack?.duration)}</span>
            </div>

            {/* Giant Controls */}
            {isAdmin ? (
              <div className="w-full flex items-center justify-between px-4 sm:px-8 text-zinc-300 pb-10">
                <motion.button whileHover={{ scale: 1.1, color: '#fff' }} className="transition-colors p-3 hidden sm:block"><Shuffle size={24} /></motion.button>
                <motion.button 
                  whileHover={{ x: -5, color: '#fff' }} 
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); prevTrack(); }} 
                  className="transition-colors p-4"
                >
                  <SkipBack size={36} className="fill-current" />
                </motion.button>
                
                <div className="relative">
                  <AnimatePresence>
                    {isPlaying && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 2 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full bg-indigo-500/20 pointer-events-none"
                      />
                    )}
                  </AnimatePresence>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="relative z-10 w-20 h-20 flex items-center justify-center bg-white text-black rounded-full shadow-2xl shadow-indigo-500/20"
                  >
                    {isPlaying ? <Pause size={36} className="fill-current" /> : <Play size={36} className="fill-current ml-1" />}
                  </motion.button>
                </div>

                <motion.button 
                  whileHover={{ x: 5, color: '#fff' }} 
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); nextTrack(); }} 
                  className="transition-colors p-4"
                >
                  <SkipForward size={36} className="fill-current" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1, color: '#fff' }} className="transition-colors p-3 hidden sm:block"><Repeat size={24} /></motion.button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center px-4 sm:px-8 text-zinc-500 pb-10">
                <button 
                  onClick={togglePlay}
                  className="w-20 h-20 flex items-center justify-center bg-zinc-800 text-zinc-200 rounded-full hover:bg-zinc-700 transition-all border border-white/5 shadow-xl"
                >
                  {isPlaying ? <Pause size={36} className="fill-current" /> : <Play size={36} className="fill-current ml-1" />}
                </button>
                <div className="mt-8 flex flex-col items-center">
                  <div className="flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Listening Mode</span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">The host is controlling the party playback</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </>
  )
}
