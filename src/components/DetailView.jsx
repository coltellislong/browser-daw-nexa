import React from 'react';
import { useDawStore } from '../store/dawStore.js';

function ClipDetail({ track, clip }) {
  if (!clip) {
    return (
      <div className="detail-empty">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="8" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" opacity=".3" />
          <path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3" />
        </svg>
        <p>No clip selected</p>
        <p className="detail-empty-hint">Click a clip in Arrangement or Session view</p>
      </div>
    );
  }

  return (
    <div className="clip-detail">
      <div className="clip-detail-header" style={{ borderLeftColor: clip.color }}>
        <span className="clip-detail-name">{clip.name}</span>
        <div className="clip-detail-color" style={{ background: clip.color }} />
      </div>

      <div className="clip-detail-body">
        {/* Waveform placeholder */}
        <div className="waveform-canvas">
          <svg width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="wvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={clip.color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={clip.color} stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {Array.from({ length: 60 }, (_, i) => {
              const h = 10 + Math.random() * 35 + Math.sin(i * 0.4) * 8;
              return (
                <rect
                  key={i}
                  x={i * 6.7}
                  y={(60 - h) / 2}
                  width="5"
                  height={h}
                  fill="url(#wvGrad)"
                  rx="1"
                />
              );
            })}
          </svg>
        </div>

        {/* Clip params */}
        <div className="clip-params">
          <div className="param-group">
            <label className="param-label">Start</label>
            <input className="param-input" type="number" defaultValue={clip.start.toFixed(2)} step="0.25" />
          </div>
          <div className="param-group">
            <label className="param-label">Length</label>
            <input className="param-input" type="number" defaultValue={clip.duration.toFixed(2)} step="0.25" />
          </div>
          <div className="param-group">
            <label className="param-label">Gain</label>
            <input className="param-input" type="range" min="0" max="2" step="0.01" defaultValue={clip.gain || 1} />
          </div>
          <div className="param-group">
            <label className="param-label">Loop</label>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked={clip.loop} />
              <span className="toggle-track" />
            </label>
          </div>
          <div className="param-group">
            <label className="param-label">Warp</label>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked={clip.warpEnabled} />
              <span className="toggle-track" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceDetail({ track }) {
  if (!track) {
    return (
      <div className="detail-empty">
        <p>No track selected</p>
      </div>
    );
  }

  const defaultDevices = track.type === 'midi'
    ? [{ id: 'd1', name: 'Wavetable', type: 'instrument', color: '#4da6ff' }, { id: 'd2', name: 'Reverb', type: 'effect', color: '#a06dff' }]
    : [{ id: 'd3', name: 'EQ Eight', type: 'effect', color: '#5ec95e' }, { id: 'd4', name: 'Compressor', type: 'effect', color: '#f7c948' }];

  return (
    <div className="device-detail">
      <div className="device-chain">
        {defaultDevices.map((device) => (
          <div
            key={device.id}
            className={`device-rack${device.type === 'instrument' ? ' device-instrument' : ' device-effect'}`}
            style={{ borderTopColor: device.color }}
          >
            <div className="device-power">
              <span className="device-power-dot" style={{ background: device.color }} />
            </div>
            <div className="device-body">
              <span className="device-name">{device.name}</span>
              <div className="device-knobs">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} className="device-knob" style={{ '--knob-color': device.color }}>
                    <svg width="22" height="22" viewBox="0 0 22 22">
                      <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="rgba(0,0,0,0.4)" />
                      <circle cx="11" cy="11" r="9" stroke={device.color} strokeWidth="2"
                        strokeDasharray={`${(k * 10) + 20} 56.5`} strokeDashoffset="14"
                        fill="none" strokeLinecap="round" transform="rotate(-135 11 11)" />
                      <circle cx="11" cy="5.5" r="1.5" fill={device.color} transform={`rotate(${(k - 1) * 30 - 45} 11 11)`} />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        <button className="device-add-btn" title="Add device">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function DetailView() {
  const { detailMode, setDetailMode, tracks, selectedTrackId, selectedClipId } = useDawStore();

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) || null;
  const selectedClip = selectedTrack
    ? selectedTrack.arrangementClips.find((c) => c.id === selectedClipId) ||
      selectedTrack.sessionClips.find((c) => c && c.id === selectedClipId)
    : null;

  return (
    <div className="detail-view">
      <div className="detail-tabs">
        <button
          className={`detail-tab${detailMode === 'clip' ? ' detail-tab-active' : ''}`}
          onClick={() => setDetailMode('clip')}
        >
          Clip
        </button>
        <button
          className={`detail-tab${detailMode === 'device' ? ' detail-tab-active' : ''}`}
          onClick={() => setDetailMode('device')}
        >
          Device
        </button>
        {selectedTrack && (
          <div className="detail-track-pill" style={{ background: selectedTrack.color + '33', borderColor: selectedTrack.color + '66' }}>
            <span className="detail-track-dot" style={{ background: selectedTrack.color }} />
            <span className="detail-track-name">{selectedTrack.name}</span>
          </div>
        )}
      </div>

      <div className="detail-content">
        {detailMode === 'clip'
          ? <ClipDetail track={selectedTrack} clip={selectedClip} />
          : <DeviceDetail track={selectedTrack} />
        }
      </div>
    </div>
  );
}
