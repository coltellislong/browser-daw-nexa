import React, { useState } from 'react';
import { useDawStore } from '../store/dawStore.js';

const CELL_W = 140;
const CELL_H = 34;

function ClipSlot({ clip, trackColor, sceneIndex, trackId, isPlaying }) {
  const { setSessionClip } = useDawStore();

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/nexa-sample');
    if (!raw) return;
    const sample = JSON.parse(raw);
    const newClip = {
      id: `sc-${Date.now()}`,
      name: sample.name.replace(/\.[^.]+$/, ''),
      color: sample.color || trackColor,
      start: 0,
      duration: sample.duration || 2,
      sampleUrl: sample.audioId || null,
      loop: true,
      gain: 1,
    };
    setSessionClip(trackId, sceneIndex, newClip);
  };

  if (!clip) {
    return (
      <div
        className="clip-slot clip-slot-empty"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        title="Empty slot — drag a sample here"
      >
        <div className="clip-launch-empty">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 1L7 4L1 7V1Z" fill="currentColor" opacity=".3" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`clip-slot clip-slot-filled${isPlaying ? ' clip-slot-playing' : ''}`}
      style={{
        background: `linear-gradient(180deg, ${clip.color}cc 0%, ${clip.color}88 100%)`,
        borderColor: clip.color,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title={clip.name}
    >
      <div className="clip-shine" />
      <div className="clip-launch-btn" title="Launch clip">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 1L7 4L1 7V1Z" fill="white" />
        </svg>
      </div>
      <span className="clip-name">{clip.name}</span>
      <div className="clip-stop-btn" title="Stop clip" onClick={(e) => e.stopPropagation()}>
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
          <rect x="1" y="1" width="5" height="5" fill="white" opacity=".7" />
        </svg>
      </div>
    </div>
  );
}

function TrackHeader({ track, isReturn }) {
  const { toggleMute, toggleSolo, toggleArm, setTrackVolume, setTrackPan, selectedTrackId, selectTrack } = useDawStore();
  const selected = selectedTrackId === track.id;

  return (
    <div
      className={`session-track-header${selected ? ' session-track-selected' : ''}`}
      style={{ width: CELL_W }}
      onClick={() => selectTrack(track.id)}
    >
      <div className="sth-color-dot" style={{ background: track.color }} />
      <div className="sth-body">
        <span className="sth-name" title={track.name}>{track.name}</span>
        <div className="sth-controls">
          {!isReturn && (
            <button
              className={`sth-btn${track.armed ? ' sth-armed' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleArm(track.id); }}
              title="Arm"
            >●</button>
          )}
          <button
            className={`sth-btn${track.soloed ? ' sth-solo' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleSolo(track.id); }}
            title="Solo"
          >S</button>
          <button
            className={`sth-btn${!track.muted ? ' sth-unmuted' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleMute(track.id); }}
            title="Mute"
          >M</button>
        </div>
        <div className="sth-faders">
          <input
            type="range" min="0" max="1" step="0.01"
            value={track.volume}
            className="sth-fader"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
            title={`Volume: ${Math.round(track.volume * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
}

function SceneLauncher({ scene, index, isActive }) {
  const { launchScene } = useDawStore();

  return (
    <div
      className={`scene-launcher${isActive ? ' scene-active' : ''}`}
      onClick={() => launchScene(index)}
      title={`Launch ${scene.name}`}
    >
      <div className="scene-play-btn">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 1L7 4L1 7V1Z" fill="currentColor" />
        </svg>
      </div>
      <span className="scene-name">{scene.name}</span>
      {scene.tempo && <span className="scene-tempo">{scene.tempo}</span>}
    </div>
  );
}

export default function SessionView() {
  const { tracks, returnTracks, masterTrack, scenes, playingSceneIndex } = useDawStore();

  const allTracks = tracks;

  return (
    <div className="session-view">
      {/* Track headers row */}
      <div className="session-headers-row">
        {/* Corner spacer */}
        <div className="session-corner" />
        {/* Track headers */}
        {allTracks.map((track) => (
          <TrackHeader key={track.id} track={track} />
        ))}
        {/* Return + Master headers */}
        {returnTracks.map((rt) => (
          <TrackHeader key={rt.id} track={rt} isReturn />
        ))}
        <div className="session-master-header" style={{ width: CELL_W }}>
          <div className="sth-color-dot" style={{ background: '#666' }} />
          <div className="sth-body">
            <span className="sth-name">Master</span>
            <div className="sth-faders">
              <input
                type="range" min="0" max="1" step="0.01"
                defaultValue={masterTrack.volume}
                className="sth-fader"
              />
            </div>
          </div>
        </div>
        {/* Scene column header */}
        <div className="scene-col-header">
          <button className="stop-all-btn" title="Stop All Clips">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="1" y="1" width="8" height="8" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Clip matrix */}
      <div className="session-matrix">
        {scenes.map((scene, sceneIdx) => (
          <div key={scene.id} className="session-row">
            {/* Track clip slots */}
            {allTracks.map((track) => (
              <ClipSlot
                key={track.id}
                clip={track.sessionClips[sceneIdx]}
                trackColor={track.color}
                sceneIndex={sceneIdx}
                trackId={track.id}
                isPlaying={playingSceneIndex === sceneIdx && !!track.sessionClips[sceneIdx]}
              />
            ))}
            {/* Return track slots */}
            {returnTracks.map((rt) => (
              <div key={rt.id} className="clip-slot clip-slot-return" style={{ width: CELL_W }} />
            ))}
            {/* Master slot */}
            <div className="clip-slot clip-slot-master" style={{ width: CELL_W }} />
            {/* Scene launcher */}
            <SceneLauncher scene={scene} index={sceneIdx} isActive={playingSceneIndex === sceneIdx} />
          </div>
        ))}
      </div>
    </div>
  );
}
