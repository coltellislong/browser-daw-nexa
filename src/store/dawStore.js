import { create } from 'zustand';

const TRACK_COLORS = [
  '#ff6b35', '#ffa040', '#f7c948', '#5ec95e',
  '#3ec9c9', '#4da6ff', '#a06dff', '#f06dbc',
];

const makeTrack = (id, name, type, colorIndex, clips = []) => ({
  id,
  name,
  type, // 'midi' | 'audio' | 'return' | 'master'
  color: TRACK_COLORS[colorIndex % TRACK_COLORS.length],
  muted: false,
  soloed: false,
  armed: false,
  volume: 0.75,
  pan: 0,
  sends: { A: 0, B: 0 },
  arrangementClips: clips,
  sessionClips: Array(8).fill(null),
  deviceChain: [],
  height: 72,
});

const makeClip = (id, name, color, start, duration, sampleUrl = null) => ({
  id,
  name,
  color,
  start,
  duration,
  sampleUrl,
  loop: true,
  gain: 1,
  warpEnabled: false,
});

const defaultScenes = Array.from({ length: 8 }, (_, i) => ({
  id: `scene-${i}`,
  name: i === 0 ? 'Intro' : i === 1 ? 'Verse' : i === 2 ? 'Chorus' : i === 3 ? 'Bridge' : `Scene ${i + 1}`,
  tempo: null,
}));

const defaultTracks = [
  makeTrack('t1', '1 MIDI', 'midi', 0, [makeClip('c1', 'Synth Lead', '#ff6b35', 0, 4)]),
  makeTrack('t2', '2 MIDI', 'midi', 1, [makeClip('c2', 'Pad', '#ffa040', 2, 8)]),
  makeTrack('t3', '3 Audio', 'audio', 2, [makeClip('c3', 'Drums Loop', '#f7c948', 0, 8)]),
  makeTrack('t4', '4 Audio', 'audio', 3, [makeClip('c4', 'Bass', '#5ec95e', 0, 16)]),
  makeTrack('t5', '5 Audio', 'audio', 4, []),
  makeTrack('t6', '6 Audio', 'audio', 5, []),
  makeTrack('t7', '7 Audio', 'audio', 6, []),
  makeTrack('t8', '8 Audio', 'audio', 7, []),
];

// Pre-fill some session clips
defaultTracks[0].sessionClips[0] = makeClip('sc1', 'Synth A', '#ff6b35', 0, 4);
defaultTracks[0].sessionClips[1] = makeClip('sc2', 'Synth B', '#ff8c35', 0, 4);
defaultTracks[1].sessionClips[0] = makeClip('sc3', 'Pad A', '#ffa040', 0, 8);
defaultTracks[2].sessionClips[0] = makeClip('sc4', 'Beat 1', '#f7c948', 0, 2);
defaultTracks[2].sessionClips[1] = makeClip('sc5', 'Beat 2', '#e8b830', 0, 2);
defaultTracks[3].sessionClips[0] = makeClip('sc6', 'Bass A', '#5ec95e', 0, 8);
defaultTracks[3].sessionClips[1] = makeClip('sc7', 'Bass B', '#4ab84a', 0, 4);

const defaultReturnTracks = [
  { ...makeTrack('rA', 'A Reverb', 'return', 5), name: 'A Reverb' },
  { ...makeTrack('rB', 'B Delay', 'return', 6), name: 'B Delay' },
];

const masterTrack = {
  id: 'master',
  name: 'Master',
  type: 'master',
  volume: 0.85,
  pan: 0,
  color: '#888',
};

export const useDawStore = create((set, get) => ({
  // Transport
  isPlaying: false,
  isRecording: false,
  bpm: 120,
  timeSignature: { num: 4, den: 4 },
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 8,
  playheadPosition: 0,
  metronomeEnabled: false,

  // Views
  activeView: 'arrangement',
  browserOpen: true,
  detailOpen: true,
  detailMode: 'clip', // 'clip' | 'device'

  // Tracks
  tracks: defaultTracks,
  returnTracks: defaultReturnTracks,
  masterTrack,
  scenes: defaultScenes,

  // Selection
  selectedTrackId: 't1',
  selectedClipId: null,
  playingSceneIndex: null,

  // Sample Library
  sampleLibrary: [],
  googleDriveLink: '',

  // Transport actions
  setPlaying: (v) => set({ isPlaying: v }),
  togglePlay: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });
  },
  stopTransport: () => set({ isPlaying: false, playheadPosition: 0 }),
  toggleRecord: () => set((s) => ({ isRecording: !s.isRecording })),
  setBpm: (bpm) => set({ bpm: Math.max(20, Math.min(999, bpm)) }),
  toggleLoop: () => set((s) => ({ loopEnabled: !s.loopEnabled })),
  toggleMetronome: () => set((s) => ({ metronomeEnabled: !s.metronomeEnabled })),
  setPlayheadPosition: (pos) => set({ playheadPosition: pos }),

  // View actions
  setActiveView: (view) => set({ activeView: view }),
  toggleBrowser: () => set((s) => ({ browserOpen: !s.browserOpen })),
  toggleDetail: () => set((s) => ({ detailOpen: !s.detailOpen })),
  setDetailMode: (mode) => set({ detailMode: mode }),

  // Track actions
  selectTrack: (id) => set({ selectedTrackId: id }),
  selectClip: (id) => set({ selectedClipId: id }),
  toggleMute: (trackId) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
    })),
  toggleSolo: (trackId) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, soloed: !t.soloed } : t)),
    })),
  toggleArm: (trackId) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, armed: !t.armed } : t)),
    })),
  setTrackVolume: (trackId, volume) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, volume } : t)),
    })),
  setTrackPan: (trackId, pan) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, pan } : t)),
    })),
  renameTrack: (trackId, name) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, name } : t)),
    })),
  setMasterVolume: (volume) =>
    set((s) => ({ masterTrack: { ...s.masterTrack, volume } })),

  // Clip actions
  addArrangementClip: (trackId, clip) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId
          ? { ...t, arrangementClips: [...t.arrangementClips, clip] }
          : t
      ),
    })),
  setSessionClip: (trackId, sceneIndex, clip) =>
    set((s) => ({
      tracks: s.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const newSessionClips = [...t.sessionClips];
        newSessionClips[sceneIndex] = clip;
        return { ...t, sessionClips: newSessionClips };
      }),
    })),
  launchScene: (sceneIndex) =>
    set({ playingSceneIndex: sceneIndex, isPlaying: true }),

  // Sample Library
  addSample: (sample) =>
    set((s) => ({ sampleLibrary: [...s.sampleLibrary, sample] })),
  setGoogleDriveLink: (link) => set({ googleDriveLink: link }),
}));
