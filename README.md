# 🎵 SyncFm: Collaborative Real-Time Rhythm

SyncFm is a high-fidelity, real-time music discovery and listening party application. Host shared sessions, sync with friends across YouTube and Spotify, and experience music together with a focus on visual excellence and zero-latency coordination.

## ✨ Key Features
- **Real-Time Synchronization**: Host-authoritative playback ensures every listener is synced within milliseconds.
- **Unified Media Engine**: Seamless integration with YouTube Data API v3 and Spotify Web Playback SDK.
- **Dynamic Animations**: Powered by Framer Motion with GPU-accelerated transitions and micro-interactions.
- **Local File Support**: Host can upload and share local device files across the room.
- **Moderation Suite**: Robust admin tools to manage the queue and guest list.
- **Adaptive UI**: Premium glassmorphism design that respects `prefers-reduced-motion`.

## 🛠 Tech Stack
| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18 (Vite), Tailwind CSS 4, Framer Motion |
| **Backend** | Node.js, Express |
| **Database** | MongoDB (Mongoose) |
| **Real-time** | Socket.IO |
| **Icons** | Lucide React |

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Spotify Premium (for Spotify Web Player integration)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/SyncFm.git
cd SyncFm

# Install Server dependencies
cd server
npm install

# Install Client dependencies
cd ../client
npm install
```

### 3. Environment Variables
Create a `.env` file in the `server/` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_uri
YOUTUBE_API_KEY=your_key
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
```

### 4. Running the App
```bash
# Start Backend (from server/)
npm start

# Start Frontend (from client/)
npm run dev
```

## 📜 Contributing
1. Fork the project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.
