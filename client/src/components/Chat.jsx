import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Send } from 'lucide-react';

export default function Chat({ code, username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socket = useSocket();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat_history', (history) => {
      setMessages(history);
    });

    socket.on('receive_chat', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('chat_history');
      socket.off('receive_chat');
    };
  }, [socket]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    socket.emit('send_chat', { code, text: input.trim() });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-3 border-b border-white/5 bg-zinc-900/50">
        <h3 className="text-sm font-semibold text-zinc-200">Live Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          const isMe = msg.sender === username;
          return (
            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
              <span className="text-[10px] text-zinc-500 mb-1 px-1">
                {msg.sender} {msg.isBot && <span className="text-indigo-400 font-bold">Bot</span>}
              </span>
              <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${
                isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-zinc-900/50 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
        />
        <button
          type="submit"
          className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
