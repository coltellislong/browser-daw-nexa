import React, { useState, useRef } from 'react';
import { useDawStore } from '../store/dawStore.js';
import { audioEngine } from '../audio/AudioEngine.js';

const CATEGORIES = [
  { id: 'sounds', label: 'Sounds', icon: '♪' },
  { id: 'drums', label: 'Drums', icon: '◉' },
  { id: 'instruments', label: 'Instruments', icon: '♫' },
  { id: 'audio-fx', label: 'Audio FX', icon: '≋' },
  { id: 'midi-fx', label: 'MIDI FX', icon: '◈' },
  { id: 'samples', label: 'Samples', icon: '▣' },
  { id: 'clips', label: 'Clips', icon: '▤' },
  { id: 'drive', label: 'Drive', icon: '☁' },
];

const PRESET_SAMPLES = [
  { id: 'ps1', name: 'Kick 808.wav', category: 'drums', color: '#ff6b35', duration: 0.5 },
  { id: 'ps2', name: 'Snare Crack.wav', category: 'drums', color: '#ffa040', duration: 0.3 },
  { id: 'ps3', name: 'Hi-Hat Closed.wav', category: 'drums', color: '#f7c948', duration: 0.1 },
  { id: 'ps4', name: 'Bass Sub.wav', category: 'sounds', color: '#5ec95e', duration: 2.0 },
  { id: 'ps5', name: 'Synth Pad A.wav', category: 'sounds', color: '#4da6ff', duration: 4.0 },
  { id: 'ps6', name: 'Vocal Chop.wav', category: 'samples', color: '#a06dff', duration: 1.2 },
  { id: 'ps7', name: 'Guitar Loop.wav', category: 'samples', color: '#f06dbc', duration: 8.0 },
  { id: 'ps8', name: 'Perc Shaker.wav', category: 'drums', color: '#ff6b35', duration: 0.4 },
  { id: 'ps9', name: 'Piano Chord.wav', category: 'instruments', color: '#4dc9ff', duration: 3.5 },
  { id: 'ps10', name: 'Lead Synth.wav', category: 'sounds', color: '#ff8c35', duration: 2.0 },
];

function SampleRow({ item, onDragStart }) {
  const barWidth = Math.min(100, (item.duration / 8) * 100);
  return (
    <div
      className="browser-item"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/nexa-sample', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
        if (onDragStart) onDragStart(item);
      }}
      title={`${item.name} — ${item.duration.toFixed(2)}s`}
    >
      <span className="browser-item-dot" style={{ background: item.color }} />
      <span className="browser-item-name">{item.name}</span>
      <div className="browser-item-bar">
        <div className="browser-item-bar-fill" style={{ width: `${barWidth}%`, background: item.color + '88' }} />
      </div>
      <span className="browser-item-dur">{item.duration.toFixed(1)}s</span>
    </div>
  );
}

function DrivePanel() {
  const { googleDriveLink, setGoogleDriveLink } = useDawStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="drive-panel">
      <div className="drive-header" onClick={() => setExpanded((e) => !e)}>
        <span className="drive-icon">☁</span>
        <span className="drive-title">Google Drive</span>
        <span className="drive-chevron">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="drive-body">
          <p className="drive-desc">Paste a shared Google Drive folder link to reference your samples.</p>
          <input
            className="drive-input"
            placeholder="https://drive.google.com/drive/folders/..."
            value={googleDriveLink}
            onChange={(e) => setGoogleDriveLink(e.target.value)}
          />
          {googleDriveLink && (
            <button
              className="drive-open-btn"
              onClick={() => window.open(googleDriveLink, '_blank')}
            >
              Open in Drive ↗
            </button>
          )}
          <p className="drive-note">
            Full Google Drive integration requires API keys. For now, open the folder in Drive and drag files here, or use local import below.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Browser() {
  const [activeCategory, setActiveCategory] = useState('samples');
  const [search, setSearch] = useState('');
  const { sampleLibrary, addSample } = useDawStore();
  const fileInputRef = useRef(null);

  const handleFileImport = async (e) => {
    const files = Array.from(e.target.files || []);
    await audioEngine.ensureStarted();
    for (const file of files) {
      if (!file.type.startsWith('audio/')) continue;
      try {
        const result = await audioEngine.loadSampleFromFile(file);
        addSample({
          id: result.id,
          name: file.name,
          category: 'samples',
          color: `hsl(${Math.random() * 360}, 65%, 55%)`,
          duration: result.duration,
          audioId: result.id,
        });
      } catch (err) {
        console.error('Failed to load sample:', err);
      }
    }
    e.target.value = '';
  };

  const handleDropImport = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    await audioEngine.ensureStarted();
    for (const file of files) {
      if (!file.type.startsWith('audio/')) continue;
      try {
        const result = await audioEngine.loadSampleFromFile(file);
        addSample({
          id: result.id,
          name: file.name,
          category: 'samples',
          color: `hsl(${Math.random() * 360}, 65%, 55%)`,
          duration: result.duration,
          audioId: result.id,
        });
      } catch (err) {
        console.error('Failed to load sample:', err);
      }
    }
  };

  const allItems = [
    ...PRESET_SAMPLES,
    ...sampleLibrary,
  ];

  const filtered = allItems.filter((item) => {
    const matchCat = activeCategory === 'drive'
      ? false
      : activeCategory === 'samples' || activeCategory === 'sounds' || activeCategory === 'drums' || activeCategory === 'instruments' || activeCategory === 'clips'
        ? item.category === activeCategory || item.category === 'samples'
        : true;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div
      className="browser"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={handleDropImport}
    >
      {/* Search */}
      <div className="browser-search-row">
        <div className="browser-search">
          <svg className="search-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.4" />
            <line x1="8.5" y1="8.5" x2="11" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            className="browser-search-input"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>×</button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="browser-cats">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`browser-cat-btn${activeCategory === cat.id ? ' browser-cat-active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
            title={cat.label}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span className="cat-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="browser-content">
        {activeCategory === 'drive' ? (
          <DrivePanel />
        ) : (
          <>
            <div className="browser-section-header">
              {activeCategory.toUpperCase().replace('-', ' ')}
              <span className="browser-count">{filtered.length}</span>
            </div>
            <div className="browser-list">
              {filtered.length === 0 ? (
                <div className="browser-empty">
                  <p>No items found</p>
                  <p className="browser-empty-hint">Import audio files below</p>
                </div>
              ) : (
                filtered.map((item) => <SampleRow key={item.id} item={item} />)
              )}
            </div>
          </>
        )}
      </div>

      {/* Import area */}
      <div className="browser-import">
        <div
          className="browser-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropImport}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v10M6 9l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Drop audio files or click to import</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileImport}
        />
      </div>
    </div>
  );
}
