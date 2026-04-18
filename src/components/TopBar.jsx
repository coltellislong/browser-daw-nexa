import React, { useState, useRef } from 'react';
import { useDawStore } from '../store/dawStore.js';
import { audioEngine } from '../audio/AudioEngine.js';

function IconBtn({ active, title, onClick, children, className = '', danger = false }) {
  return (
    <button
      className={`topbar-btn${active ? ' topbar-btn-active' : ''}${danger ? ' topbar-btn-danger' : ''} ${className}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BpmDisplay() {
  const bpm = useDawStore((s) => s.bpm);
  const setBpm = useDawStore((s) => s.setBpm);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const startEdit = () => {
    setDraft(String(bpm));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };
  const commit = () => {
    const v = parseFloat(draft);
    if (!isNaN(v)) setBpm(v);
    setEditing(false);
  };

  return editing ? (
    <input
      ref={inputRef}
      className="bpm-input"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
    />
  ) : (
    <div className="bpm-display" onDoubleClick={startEdit} title="Double-click to edit BPM">
      <span className="bpm-value">{bpm.toFixed(2)}</span>
      <span className="bpm-label">BPM</span>
    </div>
  );
}

function CpuMeter() {
  return (
    <div className="cpu-meter" title="CPU Load">
      <span className="cpu-label">CPU</span>
      <div className="cpu-bar">
        <div className="cpu-fill" style={{ width: '18%' }} />
      </div>
      <span className="cpu-pct">18%</span>
    </div>
  );
}

export default function TopBar() {
  const {
    isPlaying, isRecording, loopEnabled, metronomeEnabled,
    activeView, bpm, timeSignature,
    togglePlay, stopTransport, toggleRecord, toggleLoop, toggleMetronome,
    setActiveView,
  } = useDawStore();

  const handlePlay = async () => {
    await audioEngine.ensureStarted();
    if (isPlaying) {
      audioEngine.stopTransport();
    } else {
      audioEngine.startTransport(bpm);
    }
    togglePlay();
  };

  const handleStop = () => {
    audioEngine.stopAll();
    stopTransport();
  };

  return (
    <div className="topbar">
      {/* View Toggle */}
      <div className="topbar-section topbar-views">
        <button
          className={`view-toggle-btn${activeView === 'arrangement' ? ' view-active' : ''}`}
          onClick={() => setActiveView('arrangement')}
          title="Arrangement View"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="2.5" rx="1" fill="currentColor" opacity=".9" />
            <rect x="1" y="5.5" width="8" height="2.5" rx="1" fill="currentColor" opacity=".7" />
            <rect x="1" y="10" width="10" height="2.5" rx="1" fill="currentColor" opacity=".5" />
          </svg>
          <span>Arrange</span>
        </button>
        <button
          className={`view-toggle-btn${activeView === 'session' ? ' view-active' : ''}`}
          onClick={() => setActiveView('session')}
          title="Session View"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".9" />
            <rect x="7.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".7" />
            <rect x="1" y="7.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".5" />
            <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".3" />
          </svg>
          <span>Session</span>
        </button>
      </div>

      <div className="topbar-divider" />

      {/* Undo / Redo */}
      <div className="topbar-section">
        <IconBtn title="Undo (Ctrl+Z)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 5.5H8a3.5 3.5 0 010 7H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4.5 2.5L2 5.5l2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconBtn>
        <IconBtn title="Redo (Ctrl+Y)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M11 5.5H5a3.5 3.5 0 000 7H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8.5 2.5L11 5.5l-2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconBtn>
      </div>

      <div className="topbar-divider" />

      {/* Transport */}
      <div className="topbar-section topbar-transport">
        <IconBtn active={loopEnabled} onClick={toggleLoop} title="Toggle Loop">
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
            <path d="M1 4H10a3 3 0 010 6H4M4 10L1 7l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconBtn>

        <IconBtn active={isRecording} onClick={toggleRecord} title="Record" danger>
          <span className="rec-dot" />
        </IconBtn>

        <button
          className={`transport-play-btn${isPlaying ? ' playing' : ''}`}
          onClick={handlePlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="7.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M2 1.5L11 7L2 12.5V1.5Z" fill="currentColor" />
            </svg>
          )}
        </button>

        <button className="transport-stop-btn" onClick={handleStop} title="Stop">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="10" height="10" rx="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="topbar-divider" />

      {/* Timing */}
      <div className="topbar-section topbar-timing">
        <BpmDisplay />
        <div className="timesig-display" title="Time Signature">
          <span className="timesig-num">{timeSignature.num}</span>
          <span className="timesig-slash">/</span>
          <span className="timesig-den">{timeSignature.den}</span>
        </div>
        <IconBtn active={metronomeEnabled} onClick={toggleMetronome} title="Metronome">
          <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
            <path d="M5.5 13V7M5.5 7L2 2M5.5 7L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="2" y1="13" x2="9" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconBtn>
      </div>

      <div className="topbar-spacer" />

      {/* Right side */}
      <div className="topbar-section topbar-right">
        <CpuMeter />
        <div className="midi-indicator" title="MIDI">
          <span className="midi-dot midi-dot-in" />
          <span className="midi-label">MIDI</span>
          <span className="midi-dot midi-dot-out" />
        </div>
      </div>
    </div>
  );
}
