import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDawStore } from '../store/dawStore.js';

const ZOOM = 60; // px per beat
const HEADER_W = 232;
const TRACK_H = 72;
const RULER_H = 28;
const BEATS_VISIBLE = 64;

function formatBeats(beats) {
  const bar = Math.floor(beats / 4) + 1;
  const beat = (beats % 4) + 1;
  return `${bar}.${beat}`;
}

function Ruler({ beats }) {
  return (
    <div className="arr-ruler" style={{ width: beats * ZOOM }}>
      {Array.from({ length: beats }, (_, i) => {
        const isBar = i % 4 === 0;
        return (
          <div
            key={i}
            className={`ruler-tick${isBar ? ' ruler-bar' : ''}`}
            style={{ left: i * ZOOM }}
          >
            {isBar && <span className="ruler-label">{i / 4 + 1}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Clip({ clip, zoom, trackColor, onSelect, selected }) {
  const left = clip.start * zoom;
  const width = Math.max(clip.duration * zoom - 2, 16);

  return (
    <div
      className={`arr-clip${selected ? ' arr-clip-selected' : ''}`}
      style={{
        left,
        width,
        background: `linear-gradient(180deg, ${trackColor}dd 0%, ${trackColor}99 100%)`,
        borderColor: selected ? '#fff' : trackColor,
      }}
      onClick={onSelect}
      title={clip.name}
    >
      <div className="arr-clip-shine" />
      <span className="arr-clip-name">{clip.name}</span>
      {clip.sampleUrl && <div className="arr-clip-wave" />}
    </div>
  );
}

function TrackHeader({ track, onSelect, selected }) {
  const { toggleMute, toggleSolo, toggleArm, setTrackVolume, setTrackPan } = useDawStore();

  return (
    <div
      className={`arr-track-header${selected ? ' arr-track-header-selected' : ''}`}
      onClick={onSelect}
    >
      <div className="track-color-strip" style={{ background: track.color }} />
      <div className="track-header-body">
        <div className="track-header-top">
          <span className="track-name">{track.name}</span>
          <div className="track-header-btns">
            <button
              className={`trbtn${track.armed ? ' trbtn-armed' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleArm(track.id); }}
              title="Arm for Recording"
            >●</button>
            <button
              className={`trbtn${track.soloed ? ' trbtn-solo' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleSolo(track.id); }}
              title="Solo"
            >S</button>
            <button
              className={`trbtn${track.muted ? '' : ' trbtn-active'}`}
              onClick={(e) => { e.stopPropagation(); toggleMute(track.id); }}
              title="Mute"
            >M</button>
          </div>
        </div>
        <div className="track-header-faders">
          <div className="fader-row">
            <span className="fader-label">Vol</span>
            <input
              type="range" min="0" max="1" step="0.01"
              value={track.volume}
              className="track-fader"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
            />
          </div>
          <div className="fader-row">
            <span className="fader-label">Pan</span>
            <input
              type="range" min="-1" max="1" step="0.01"
              value={track.pan}
              className="track-fader track-fader-pan"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setTrackPan(track.id, parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackLane({ track, zoom, playheadPos, selectedClipId, onClipSelect, onDrop }) {
  const laneRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (laneRef.current) laneRef.current.classList.add('drag-over');
  };
  const handleDragLeave = () => {
    if (laneRef.current) laneRef.current.classList.remove('drag-over');
  };
  const handleDrop = (e) => {
    e.preventDefault();
    if (laneRef.current) laneRef.current.classList.remove('drag-over');
    const raw = e.dataTransfer.getData('application/nexa-sample');
    if (!raw) return;
    const sample = JSON.parse(raw);
    const rect = laneRef.current.getBoundingClientRect();
    const beatPos = Math.max(0, Math.round((e.clientX - rect.left) / zoom));
    onDrop(sample, beatPos);
  };

  return (
    <div
      ref={laneRef}
      className="arr-lane"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Beat grid */}
      {Array.from({ length: BEATS_VISIBLE }, (_, i) => (
        <div
          key={i}
          className={`lane-grid-line${i % 4 === 0 ? ' lane-bar-line' : ''}`}
          style={{ left: i * zoom }}
        />
      ))}
      {/* Clips */}
      {track.arrangementClips.map((clip) => (
        <Clip
          key={clip.id}
          clip={clip}
          zoom={zoom}
          trackColor={track.color}
          selected={selectedClipId === clip.id}
          onSelect={() => onClipSelect(clip.id)}
        />
      ))}
      {/* Drop hint */}
      <div className="lane-drop-hint">Drop sample here</div>
    </div>
  );
}

export default function ArrangementView() {
  const {
    tracks, selectedTrackId, selectedClipId,
    selectTrack, selectClip, addArrangementClip,
    isPlaying, playheadPosition,
  } = useDawStore();

  const [zoom] = useState(ZOOM);
  const scrollRef = useRef(null);
  const playheadRef = useRef(null);
  const animRef = useRef(null);
  const startTimeRef = useRef(null);
  const startPosRef = useRef(null);

  // Animate playhead
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now();
      startPosRef.current = playheadPosition;
      const bpm = useDawStore.getState().bpm;
      const animate = (now) => {
        const elapsed = (now - startTimeRef.current) / 1000;
        const beats = startPosRef.current + elapsed * (bpm / 60);
        useDawStore.getState().setPlayheadPosition(beats);
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  const handleDrop = useCallback(
    (track, sample, beatPos) => {
      const newClip = {
        id: `clip-${Date.now()}`,
        name: sample.name.replace(/\.[^.]+$/, ''),
        color: sample.color,
        start: beatPos,
        duration: Math.max(1, Math.round((sample.duration / (60 / useDawStore.getState().bpm)) * 4) / 4),
        sampleUrl: sample.audioId || null,
        loop: true,
        gain: 1,
      };
      addArrangementClip(track.id, newClip);
      selectTrack(track.id);
    },
    [addArrangementClip, selectTrack]
  );

  const totalWidth = BEATS_VISIBLE * zoom;

  return (
    <div className="arrangement-view">
      {/* Ruler row */}
      <div className="arr-ruler-row">
        <div className="arr-ruler-spacer" style={{ width: HEADER_W }} />
        <div className="arr-ruler-scroll" ref={scrollRef}>
          <Ruler beats={BEATS_VISIBLE} />
          {/* Playhead on ruler */}
          <div
            className="arr-playhead-ruler"
            style={{ left: playheadPosition * zoom }}
          />
        </div>
      </div>

      {/* Tracks */}
      <div className="arr-tracks-scroll">
        {tracks.map((track) => (
          <div key={track.id} className="arr-track-row" style={{ height: TRACK_H }}>
            <TrackHeader
              track={track}
              selected={selectedTrackId === track.id}
              onSelect={() => selectTrack(track.id)}
            />
            <div className="arr-lane-wrap" style={{ width: totalWidth, position: 'relative' }}>
              <TrackLane
                track={track}
                zoom={zoom}
                playheadPos={playheadPosition}
                selectedClipId={selectedClipId}
                onClipSelect={selectClip}
                onDrop={(sample, beatPos) => handleDrop(track, sample, beatPos)}
              />
              {/* Playhead */}
              <div
                className="arr-playhead"
                style={{ left: playheadPosition * zoom }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
