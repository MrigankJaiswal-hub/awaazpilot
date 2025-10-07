// Lightweight mic-to-text using the Web Speech API (Chrome/Edge).
// Named export: useRecorder
export type RecState = 'idle' | 'recording' | 'error';

export function useRecorder(targetLang: string) {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  let recognition: any = null;
  let listeners: Array<(text: string, isFinal: boolean) => void> = [];
  let state: RecState = 'idle';

  const langMap: Record<string, string> = {
    'mr-IN': 'mr-IN',
    'gu-IN': 'gu-IN',
    'kn-IN': 'kn-IN',
    'te-IN': 'te-IN',
    'hi-IN': 'hi-IN',
    'en-IN': 'en-IN'
  };

  function supported(): boolean {
    return Boolean(SpeechRecognition);
  }

  function onTranscript(cb: (text: string, isFinal: boolean) => void) {
    listeners.push(cb);
    return () => (listeners = listeners.filter((f) => f !== cb));
  }

  function start(): void {
    if (!supported()) {
      state = 'error';
      fire('', true);
      return;
    }
    if (state === 'recording') return;

    recognition = new SpeechRecognition();
    recognition.lang = langMap[targetLang] || 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: any) => {
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript as string;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      if (finalText) fire(finalText, true);
      else if (interim) fire(interim, false);
    };

    recognition.onerror = () => {
      state = 'error';
      stop();
    };

    recognition.onend = () => {
      state = 'idle';
    };

    state = 'recording';
    recognition.start();
  }

  function stop(): void {
    if (recognition) {
      try { recognition.stop(); } catch {}
      recognition = null;
    }
    state = 'idle';
  }

  function getState(): RecState {
    return state;
  }

  function fire(text: string, isFinal: boolean) {
    listeners.forEach((fn) => fn(text, isFinal));
  }

  return { supported, start, stop, onTranscript, getState };
}
