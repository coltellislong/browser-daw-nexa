import React, { useState, useEffect, useCallback } from 'react';

const CORRECT_PIN = '777';

export default function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const press = useCallback(
    (digit) => {
      if (success || pin.length >= 8) return;
      setPin((p) => p + digit);
      setError(false);
    },
    [pin, success]
  );

  const backspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  }, []);

  const submit = useCallback(() => {
    if (pin === CORRECT_PIN) {
      setSuccess(true);
      setTimeout(onUnlock, 900);
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 700);
    }
  }, [pin, onUnlock]);

  useEffect(() => {
    const down = (e) => {
      if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Enter') submit();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [press, backspace, submit]);

  const maxDots = Math.max(3, pin.length + (success ? 0 : 1));

  return (
    <div className={`pin-screen${success ? ' pin-success' : ''}`}>
      <div className="pin-orb pin-orb-1" />
      <div className="pin-orb pin-orb-2" />
      <div className="pin-orb pin-orb-3" />

      <div className={`pin-card${error ? ' pin-shake' : ''}`}>
        <div className="pin-logo-wrap">
          <div className="pin-logo-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="url(#lg1)" strokeWidth="2" fill="rgba(0,150,255,0.08)" />
              <path d="M14 24 L20 14 L28 32 L34 22" stroke="url(#lg2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="24" cy="24" r="3" fill="#4dc9ff" />
              <defs>
                <linearGradient id="lg1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4dc9ff" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
                <linearGradient id="lg2" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4dc9ff" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="pin-logo-text">NEXA</span>
          <span className="pin-logo-sub">DIGITAL AUDIO WORKSTATION</span>
        </div>

        <div className="pin-separator" />

        <p className="pin-hint">Enter PIN to unlock</p>

        <div className="pin-dots">
          {Array.from({ length: maxDots }, (_, i) => (
            <span
              key={i}
              className={`pin-dot${i < pin.length ? ' pin-dot-filled' : ''}${
                success && i < pin.length ? ' pin-dot-success' : ''
              }`}
            />
          ))}
        </div>

        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} className="pin-key" onClick={() => press(String(n))}>
              <span className="pin-key-num">{n}</span>
            </button>
          ))}
          <button className="pin-key pin-key-back" onClick={backspace}>
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M7 1L1 7L7 13M1 7H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="pin-key" onClick={() => press('0')}>
            <span className="pin-key-num">0</span>
          </button>
          <button className="pin-key pin-key-enter" onClick={submit}>
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M1 1H13V7M13 7L9 3M13 7L9 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {error && <p className="pin-error">Incorrect PIN — try again</p>}
        {success && <p className="pin-unlocking">Unlocking NEXA DAW…</p>}
      </div>

      <p className="pin-version">NEXA DAW v1.0 · Browser Edition</p>
    </div>
  );
}
