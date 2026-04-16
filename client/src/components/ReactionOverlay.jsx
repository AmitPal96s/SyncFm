import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function ReactionOverlay() {
  const [reactions, setReactions] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('receive_reaction', ({ emoji, id }) => {
      const x = Math.random() * 80 + 10; // Between 10% and 90% view width
      setReactions(prev => [...prev, { id, emoji, x }]);

      // Remove after animation completes (approx 2.5s)
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    });

    return () => socket.off('receive_reaction');
  }, [socket]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translateY(80vh) scale(1.2); }
          100% { transform: translateY(-10vh) scale(1); opacity: 0; }
        }
        .animate-float {
          animation: float-up 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>
      {reactions.map(r => (
        <div 
          key={r.id} 
          className="absolute text-4xl animate-float"
          style={{ left: `${r.x}%`, bottom: '-50px' }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
}
