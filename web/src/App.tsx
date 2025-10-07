import React from 'react';
import VoiceConsole from './components/VoiceConsole';
import Dubber from './components/Dubber';

export default function App() {
  return (
    <main className="container">
      <header className="header">
        <div className="brand">
          <span className="logo">🔊</span>
          <h1>AwaazPilot</h1>
        </div>
        <p className="subtitle">
          Lightning-fast Murf voice via WebSockets & AI Dubbing Studio 🎞️
        </p>
      </header>

      {/* 💡 Main Grid for Voice + Dubber */}
      <section className="grid">
        {/* 🎙️ Real-time Voice Console */}
        <VoiceConsole />

        {/* 🎞️ Instant Dubber (Bonus Feature) */}
        <div className="card">
          <h2>🎞️ Instant Dubber (Bonus)</h2>
          <p className="muted">
            Upload a short MP4 and pick a target language to auto-dub your media 🎬
            <br />
            <em>Requires backend route <code>/api/dub</code> to be implemented</em>
          </p>
          <Dubber />
        </div>
      </section>

      <footer className="footer">
        <p>
          🔐 Keys never leave server; streaming via WS proxy. 🌐
          <strong> 🇮🇳 Multilingual ready</strong> — English & Hindi live, more soon!
        </p>
      </footer>
    </main>
  );
}
