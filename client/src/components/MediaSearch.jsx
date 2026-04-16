import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Search, Plus, Music, Play, RefreshCw, Upload, FileAudio } from 'lucide-react';

export default function MediaSearch({ code, isAdmin }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [apiMeta, setApiMeta] = useState({ youtubeEnabled: true, spotifyEnabled: true });
  const socket = useSocket();
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().startsWith('http')) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 2) {
        performSearch(query.trim());
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (searchTerm) => {
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      if (data.success) {
        setResults(data.results);
        setApiMeta(data.meta || { youtubeEnabled: true, spotifyEnabled: true });
        setShowDropdown(true);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (data.success) {
        const track = {
          id: `local_${Date.now()}`,
          title: data.filename.replace(/\.[^/.]+$/, ""), 
          artist: "Device Upload",
          albumArt: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=500',
          audioUrl: data.url,
          type: 'audio',
          duration: 0 
        };
        socket.emit('add_to_queue', { code, track });
      } else {
         alert(data.error || "Upload failed");
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert("Upload failed. File might be too large (>20MB) or server is unreachable.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectTrack = (track) => {
    if (socket) {
      socket.emit('add_to_queue', { code, track });
      setQuery('');
      setResults([]);
      setShowDropdown(false);
    }
  };

  const formatTrackTitle = (value) => {
    const cleaned = value
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();

    return cleaned || 'Direct Audio';
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!query || !socket) return;

    const trimmedUrl = query.trim();
    let track = null;

    if (trimmedUrl.startsWith('http')) {
      const ytMatch = trimmedUrl.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^"&?/\s]{11})/);
      if (ytMatch && ytMatch[1]) {
        track = {
          id: 'yt_' + ytMatch[1],
          title: 'YouTube Track',
          artist: 'YouTube',
          albumArt: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
          type: 'youtube',
          sourceId: ytMatch[1],
          duration: 300
        };
      } 
      else if (trimmedUrl.includes('spotify.com/track/')) {
        const spMatch = trimmedUrl.match(/track\/([a-zA-Z0-9]+)/);
        if (spMatch && spMatch[1]) {
          track = {
            id: 'sp_' + spMatch[1],
            title: 'Spotify Track',
            artist: 'Spotify',
            albumArt: 'https://developer.spotify.com/images/guidelines/design/icon3@2x.png',
            type: 'spotify',
            sourceId: `spotify:track:${spMatch[1]}`,
            duration: 200
          };
        }
      } else {
        try {
          const parsedUrl = new URL(trimmedUrl);
          const fileName = decodeURIComponent(parsedUrl.pathname.split('/').pop() || '');
          track = {
            id: `audio_${Date.now()}`,
            title: formatTrackTitle(fileName),
            artist: parsedUrl.hostname.replace(/^www\./, ''),
            albumArt: 'https://via.placeholder.com/512x512.png?text=Audio',
            audioUrl: trimmedUrl,
            type: 'audio',
            duration: 0
          };
        } catch {
          track = null;
        }
      }

      if (track) {
        socket.emit('add_to_queue', { code, track });
        setQuery('');
      } else {
        alert("Invalid URL. Please paste a direct YouTube, Spotify, or audio link.");
      }
    } else if (results.length > 0) {
      handleSelectTrack(results[0]);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-6 bg-zinc-900/50 border-b border-white/5 space-x-3 group">
        <div className="p-2 bg-indigo-500/10 rounded-full group-hover:bg-indigo-500/20 transition-colors">
          <Music size={16} className="text-indigo-400" />
        </div>
        <p className="text-sm font-medium text-zinc-400">The host is currently managing the queue</p>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <form onSubmit={handleManualAdd} className="flex p-3 bg-zinc-900/50 border-b border-white/5 relative z-20">
        <div className="relative flex-1">
          {isLoading ? (
            <RefreshCw size={14} className="absolute left-3 top-2.5 text-indigo-500 animate-spin" />
          ) : (
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          )}
          <input 
            type="text" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => query.length > 2 && setShowDropdown(true)}
            placeholder="Search songs or paste URL..."
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          className="hidden"
        />
        
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="ml-2 bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition-colors border border-white/5 disabled:opacity-50"
          title="Upload local song"
        >
          <Upload size={16} className="text-zinc-400" />
        </button>

        <button 
          type="submit" 
          className="ml-2 bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg transition-colors shadow-lg"
        >
          <Plus size={16} />
        </button>
      </form>

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 max-h-80 overflow-y-auto bg-zinc-900/95 backdrop-blur-xl border-x border-b border-white/10 rounded-b-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 scrollbar-thin">
          {results.length > 0 ? (
            results.map((track) => (
              <button
                key={track.id}
                onClick={() => handleSelectTrack(track)}
                className="w-full flex items-center p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
              >
                <div className="relative w-10 h-10 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                  <img src={track.albumArt} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute bottom-0 right-0 p-0.5 bg-black/60 rounded-tl-md">
                     {track.type === 'youtube' ? <Play size={10} className="text-red-500" /> : <Music size={10} className="text-green-500" />}
                  </div>
                </div>
                <div className="ml-3 flex-1 text-left min-w-0">
                  <h5 className="text-xs font-semibold text-zinc-100 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{track.title}</h5>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs font-medium text-zinc-400">No results found.</p>
              {(!apiMeta.youtubeEnabled || !apiMeta.spotifyEnabled) && (
                <p className="text-[10px] text-red-400/80 mt-2 px-4 italic">
                  Search keys (YOUTUBE_API_KEY / SPOTIFY_CLIENT_SECRET) missing in backend .env!
                </p>
              )}
            </div>
          )}
          <div className="p-2 text-[10px] text-zinc-500 text-center bg-black/20">
            Powered by YouTube & Spotify
          </div>
        </div>
      )}
    </div>
  );
}

