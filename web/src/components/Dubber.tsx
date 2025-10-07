import React, { useState } from 'react';

export default function Dubber() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultUrl(null);

    if (!file) {
      setError('Pick a WAV/MP3/MP4 first.');
      return;
    }

    const sizeKB = (file.size / 1024).toFixed(1);
    console.log(`Uploading ${file.name} (${sizeKB} KB) → /api/dub [${lang}]`);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('media', file);
      form.append('language', lang);

      const r = await fetch('/api/dub', { method: 'POST', body: form });
      const text = await r.text();
      let j: any = {};
      try { j = JSON.parse(text); } catch { /* leave as text */ }

      if (!r.ok) {
        setError(`Server error ${r.status}: ${r.statusText}\n${text}`);
        return;
      }

      // Normalize
      const audioUrl = j?.audioUrl || j?.audioURL || j?.audio_file || j?.audioFile || null;
      const audioBase64 = j?.audioBase64 || j?.encodedAudio || null;

      if (audioUrl) {
        setResultUrl(audioUrl);
      } else if (audioBase64) {
        // Build a blob URL from base64
        const bin = atob(audioBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        setResultUrl(URL.createObjectURL(blob));
      } else {
        setError('No audio in response.');
      }
    } catch (err: any) {
      setError(`Fetch failed: ${String(err?.message || err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>🎞️ Instant Dubber (Bonus)</h2>
      <p className="muted">Upload a short MP4/WAV/MP3 and pick a target language.</p>

      <form onSubmit={onSubmit} className="row" encType="multipart/form-data">
        <input
          type="file"
          accept=".mp4,.wav,.mp3,audio/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <label>Target Language</label>
        <select value={lang} onChange={(e) => setLang(e.target.value as any)}>
          <option value="en-IN">English (India)</option>
          <option value="hi-IN">Hindi</option>
        </select>
        <button className="btn primary" type="submit" disabled={busy || !file}>
          {busy ? 'Uploading…' : 'Dub ▶'}
        </button>
      </form>

      {error && (
        <pre className="error" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
          {error}
        </pre>
      )}

      {resultUrl && (
        <div style={{ marginTop: 12 }}>
          <h3>✅ Dubbed Audio</h3>
          <audio controls src={resultUrl} />
          <div style={{ marginTop: 6 }}>
            <a className="btn" href={resultUrl} download>
              ⬇️ Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
