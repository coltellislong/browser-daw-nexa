// Main DAW app component

function App() {
  const [tracks, setTracks] = useState(TRACKS_INIT);
  const [selectedClip, setSelectedClip] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState("t1");
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loop, setLoop] = useState(true);
  const [metro, setMetro] = useState(true);
  const [bpm, setBpm] = useState(120);
  const [playhead, setPlayhead] = useState(0); // in beats
  const [masterVol, setMasterVol] = useState(0.78);
  const [driveOpen, setDriveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [prClip, setPrClip] = useState(null);
  const [driveFolder, setDriveFolder] = useState(null); // array of sample names
  const [toast, setToast] = useState(null);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [drag, setDrag] = useState(null); // {name, fromDrive}
  const timelineRef = useRef(null);

  // Tweakable defaults
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "aeroIntensity": 0.85,
    "gloss": 0.9,
    "accentHue": 155,
    "theme": "day"
  }/*EDITMODE-END*/;
  const [tweaks, setTweaks] = useState(TWEAKS);

  // Edit mode wiring
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Apply tweaks to :root
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--aero", tweaks.aeroIntensity);
    r.style.setProperty("--gloss", tweaks.gloss);
    r.style.setProperty("--accent", `oklch(0.78 0.17 ${tweaks.accentHue})`);
    r.style.setProperty("--accent-deep", `oklch(0.55 0.18 ${tweaks.accentHue - 5})`);
    r.style.setProperty("--accent-rim", `oklch(0.88 0.12 ${tweaks.accentHue + 5})`);
    document.body.setAttribute("data-theme", tweaks.theme);
  }, [tweaks]);

  const setTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
  };

  // Playback
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf;
    const step = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setPlayhead(p => {
        const beats = p + (bpm / 60) * dt;
        const max = TOTAL_BARS * BEATS_PER_BAR;
        if (beats >= max) return loop ? 0 : max;
        return beats;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, bpm, loop]);

  // Space bar = play/pause
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.code === "Space") { e.preventDefault(); setPlaying(p => !p); }
      if (e.key === "Home") setPlayhead(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Meters (animated)
  const [meters, setMeters] = useState({ t1: 0, t2: 0, t3: 0, t4: 0, master: 0 });
  useEffect(() => {
    const iv = setInterval(() => {
      setMeters(prev => {
        const out = {};
        let sum = 0;
        for (const t of tracks) {
          const anyPlaying = playing && t.clips.some(c =>
            playhead >= c.start * BEATS_PER_BAR && playhead < (c.start + c.len) * BEATS_PER_BAR
          );
          const base = anyPlaying ? (0.55 + Math.random() * 0.4) : (playing ? Math.random() * 0.1 : 0);
          const lvl = t.mute ? 0 : base * t.vol;
          out[t.id] = lvl;
          sum += lvl;
        }
        out.master = Math.min(0.98, sum / tracks.length + (playing ? 0.15 : 0)) * masterVol;
        return out;
      });
    }, 80);
    return () => clearInterval(iv);
  }, [playing, playhead, tracks, masterVol]);

  // Selected track
  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];

  // Track updates
  const updateTrack = (id, patch) => {
    setTracks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  // Add a clip from drop
  const handleDrop = (trackId, beats, name) => {
    const len = 8;
    const newClip = {
      id: "c" + Math.random().toString(36).slice(2, 8),
      start: Math.floor(beats / BEATS_PER_BAR),
      len,
      name,
      color: "#7ae0ff",
      seed: Math.floor(Math.random() * 1000)
    };
    setTracks(ts => ts.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t));
    setToast(`Dropped ${name}`);
    setTimeout(() => setToast(null), 2500);
  };

  // Time readout
  const timeStr = useMemo(() => {
    const sec = playhead * (60 / bpm);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }, [playhead, bpm]);

  return (
    <>
      <AeroOrbs intensity={tweaks.aeroIntensity}/>
      <div className="app">
        {/* TOPBAR */}
        <div className="topbar glass">
          <div className="logo">
            <div className="mark"/>
            <div>AMANE <span style={{ fontWeight: 400, opacity: .7, fontSize: 11, letterSpacing: 1 }}>DAW</span></div>
          </div>
          <div style={{ width: 1, height: 30, background: "rgba(0,0,0,.15)", margin: "0 4px" }}/>
          <div className="transport">
            <button className="tbtn" title="Return to start" onClick={() => setPlayhead(0)}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 2v8M10 2L4 6l6 4V2z" fill="currentColor"/></svg>
            </button>
            <button className={`tbtn play ${playing ? "on" : ""}`} title="Play/Stop (space)"
              onClick={() => setPlaying(p => !p)}>
              {playing ? (
                <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="2" width="3" height="8" fill="currentColor"/><rect x="7" y="2" width="3" height="8" fill="currentColor"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
              )}
            </button>
            <button className={`tbtn rec ${recording ? "on" : ""}`} title="Record"
              onClick={() => setRecording(r => !r)}>
              <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor"/></svg>
            </button>
            <button className={`tbtn ${loop ? "on" : ""}`} title="Loop" onClick={() => setLoop(l => !l)}
              style={loop ? { color: "#0a6a2c", background: "linear-gradient(180deg,#d4f7e2,#8dd5a5 50%,#5cb77a 50%,#b6ecc8)" } : {}}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5h8l-2-2M12 9H4l2 2"/></svg>
            </button>
          </div>
          <div className="readout" title="Position">{fmtBarsBeats(playhead)}</div>
          <div className="readout" title="Time">{timeStr}</div>
          <div style={{ width: 1, height: 30, background: "rgba(0,0,0,.15)", margin: "0 4px" }}/>
          <div className="chrome" style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px" }}>
            <LED color={metro ? "amber" : ""} on={metro && playing}/>
            <button className="tbtn" style={{ width: "auto", padding: "0 6px", border: "none", background: "transparent", boxShadow: "none" }}
              onClick={() => setMetro(m => !m)} title="Metronome">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M4 12L7 2l3 10" /><path d="M3 12h8"/>
              </svg>
            </button>
            <input type="number" value={bpm} onChange={e => setBpm(Math.max(40, Math.min(240, +e.target.value || 120)))}
              style={{
                width: 46, border: "none", background: "transparent",
                fontFamily: "Consolas, monospace", fontWeight: 700, fontSize: 13, textAlign: "right", outline: "none"
              }}/>
            <span style={{ fontSize: 10, color: "var(--ink-soft)", fontWeight: 700 }}>BPM</span>
          </div>
          <div className="chrome" style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px" }}>
            <span style={{ fontFamily: "Consolas, monospace", fontSize: 12, fontWeight: 700 }}>4/4</span>
          </div>
          <div className="spacer"/>
          <button className="btn" onClick={() => setDriveOpen(true)}>
            <span style={{
              width: 14, height: 12, display: "inline-block",
              background: "conic-gradient(from 120deg at 50% 55%, #0f9d58 0 33%, #f4b400 0 66%, #4285f4 0 100%)",
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)", borderRadius: 2
            }}/>
            Import Samples
          </button>
          <button className="btn primary" onClick={() => setExportOpen(true)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 1v8M3 6l3 3 3-3M2 11h8"/>
            </svg>
            Export Demo
          </button>
        </div>

        {/* BROWSER */}
        <div className="browser glass">
          <div className="panel-head">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 3h4l1 2h7v6H1V3z"/></svg>
            Library
          </div>
          <div className="drive-btn chrome" onClick={() => setDriveOpen(true)} style={{ margin: 8, padding: "6px 10px" }}>
            <span className="gicon"/>
            <span>Connect Drive folder…</span>
          </div>
          {driveFolder && (
            <div className="folder open" style={{ margin: "0 6px 6px" }}>
              <div className="folder-head" style={{ background: "linear-gradient(180deg, #aef7cb, #4fd089 50%, #25a362 50%, #68e39d)", color: "#0a2a18" }}>
                <span className="caret" style={{ transform: "rotate(90deg)" }}>▶</span>
                📁 Drive: Project Samples
              </div>
              <div className="folder-items">
                {driveFolder.map((s, i) => (
                  <div key={i} className="sample"
                    draggable
                    onDragStart={() => setDrag({ name: s, fromDrive: true })}
                    onDragEnd={() => setDrag(null)}>
                    <span className="wave"/> {s}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="browser-list">
            <BrowserFolders onDragStart={(s) => setDrag({ name: s, fromDrive: false })}
              onDragEnd={() => setDrag(null)}/>
          </div>
        </div>

        {/* ARRANGEMENT */}
        <div className="arrange glass">
          <div className="arrange-head">
            <div className="seg-ctrl">
              <button className="on">Arrangement</button>
              <button disabled style={{ opacity: .5 }}>Session</button>
            </div>
            <div style={{ flex: 1 }}/>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600 }}>
              {tracks.length} tracks · {tracks.reduce((a,t) => a + t.clips.length, 0)} clips
            </div>
          </div>
          <div className="timeline-wrap">
            <div className="track-heads">
              <div className="ruler" style={{ justifyContent: "flex-start" }}>
                <div style={{ padding: "6px 8px", fontWeight: 700, color: "var(--ink)" }}>Tracks</div>
              </div>
              {tracks.map(t => (
                <TrackHead key={t.id} track={t} selected={selectedTrackId === t.id}
                  meter={meters[t.id] || 0}
                  onSelect={() => setSelectedTrackId(t.id)}
                  onToggle={(k) => updateTrack(t.id, { [k]: !t[k] })}
                  onVol={(v) => updateTrack(t.id, { vol: v })}
                  onPan={(v) => updateTrack(t.id, { pan: v })}/>
              ))}
            </div>
            <div className="timeline-scroll" ref={timelineRef}>
              <div className="timeline-inner" style={{ width: TOTAL_BARS * PX_PER_BAR }}>
                <div className="ruler">
                  {Array.from({ length: TOTAL_BARS }).map((_, i) => (
                    <div key={i} className="bar" style={{ width: PX_PER_BAR, flexShrink: 0 }}>{i + 1}</div>
                  ))}
                </div>
                <div className="timeline-body">
                  {tracks.map(t => (
                    <Lane key={t.id} track={t}
                      onClipClick={(c) => { setSelectedClip(c.id); setSelectedTrackId(t.id); }}
                      onClipDouble={(c) => t.kind === "midi" && setPrClip(c)}
                      selectedClip={selectedClip}
                      onDropSample={(beats, name) => handleDrop(t.id, beats, name)}/>
                  ))}
                  <div className="playhead" style={{ left: playhead * PX_PER_BEAT + 1 }}/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DEVICES */}
        <div className="devices glass">
          <div className="panel-head">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1.5" y="3" width="11" height="8" rx="1"/><path d="M4 6v2M7 5v4M10 6v2"/></svg>
            Device Rack — {selectedTrack.name}
            <div style={{ flex: 1 }}/>
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase" }}>3 devices</div>
          </div>
          <div className="device-rack">
            <EQDevice/>
            <ReverbDevice/>
            <CompressorDevice/>
            <AddDeviceSlot/>
          </div>
        </div>

        {/* INSPECTOR */}
        <div className="inspector glass">
          <div className="panel-head">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 12v-2M7 12V4M12 12V7"/></svg>
            Master
          </div>
          <div className="inspector-body">
            <div className="master-strip">
              <FaderTall value={masterVol} onChange={setMasterVol}/>
              <VUMeterTall level={meters.master}/>
              <VUMeterTall level={meters.master * 0.95}/>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: .4 }}>Master</div>
                <div className="readout" style={{ textAlign: "center", fontSize: 12 }}>
                  {(masterVol * 12 - 6).toFixed(1)} dB
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <LED color="green" on={playing}/>
                  <LED color="blue" on={true}/>
                  <LED color="amber" on={metro}/>
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-soft)", marginTop: 6 }}>STEREO OUT</div>
                <div style={{ fontSize: 11, fontFamily: "Consolas, monospace", color: "var(--ink)" }}>1/2 · Built-in</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>Spectrum Analyzer</div>
              <SpectrumAnalyzer playing={playing} level={meters.master}/>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>Session Info</div>
              <div style={{
                background: "linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.15))",
                border: "1px solid rgba(255,255,255,.6)", borderRadius: 8, padding: 8,
                fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.7
              }}>
                <div><b style={{ color: "var(--ink)" }}>Project:</b> Untitled.aero</div>
                <div><b style={{ color: "var(--ink)" }}>Sample rate:</b> 44.1 kHz</div>
                <div><b style={{ color: "var(--ink)" }}>Tempo:</b> {bpm} BPM</div>
                <div><b style={{ color: "var(--ink)" }}>Length:</b> {TOTAL_BARS} bars</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {driveOpen && <DriveImportModal onClose={() => setDriveOpen(false)}
        onImport={(files) => { setDriveFolder(files); setDriveOpen(false); setToast(`Imported ${files.length} samples from Drive`); setTimeout(() => setToast(null), 2800); }}/>}
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} onDone={() => { setExportOpen(false); setToast("Demo downloaded"); setTimeout(() => setToast(null), 2500); }}/>}
      {prClip && <PianoRollModal clip={prClip} onClose={() => setPrClip(null)}/>}
      {toast && <div className="toast glass">{toast}</div>}
      <TweaksPanel open={tweaksOpen} tweaks={tweaks} setTweak={setTweak}/>
    </>
  );
}

function AeroOrbs({ intensity }) {
  const orbs = useMemo(() => [
    { x: "8%",  y: "12%", size: 140, d: 0 },
    { x: "78%", y: "22%", size: 180, d: 1 },
    { x: "45%", y: "65%", size: 90,  d: 2 },
    { x: "22%", y: "82%", size: 110, d: 3 },
    { x: "90%", y: "78%", size: 70,  d: 4 },
  ], []);
  return (
    <div className="aero-orbs" style={{ opacity: intensity * 0.85 }}>
      {orbs.map((o, i) => (
        <div key={i} className="orb" style={{
          left: o.x, top: o.y, width: o.size, height: o.size,
          animation: `float${i} ${8 + i * 2}s ease-in-out infinite alternate`
        }}/>
      ))}
      <style>{`
        @keyframes float0 { to { transform: translate(20px, -10px); } }
        @keyframes float1 { to { transform: translate(-15px, 20px); } }
        @keyframes float2 { to { transform: translate(10px, 15px); } }
        @keyframes float3 { to { transform: translate(-20px, -10px); } }
        @keyframes float4 { to { transform: translate(15px, -15px); } }
      `}</style>
    </div>
  );
}

function BrowserFolders({ onDragStart, onDragEnd }) {
  const [folders, setFolders] = useState(BROWSER_FOLDERS);
  const toggle = (i) => {
    setFolders(fs => fs.map((f, j) => j === i ? { ...f, open: !f.open } : f));
  };
  return (
    <>
      {folders.map((f, i) => (
        <div key={i} className={`folder ${f.open ? "open" : ""}`}>
          <div className="folder-head" onClick={() => toggle(i)}>
            <span className="caret">▶</span>
            <span style={{
              width: 14, height: 12, display: "inline-block",
              background: "linear-gradient(180deg,#ffe18a,#d9a82b)",
              borderRadius: 2, border: "1px solid #8a6a0a"
            }}/>
            {f.name}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-soft)" }}>{f.samples.length}</span>
          </div>
          <div className="folder-items">
            {f.samples.map((s, j) => (
              <div key={j} className="sample"
                draggable
                onDragStart={() => onDragStart(s)}
                onDragEnd={onDragEnd}>
                <span className="wave"/>
                {s}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function TrackHead({ track, selected, meter, onSelect, onToggle, onVol, onPan }) {
  return (
    <div className="track-head" onClick={onSelect}
      style={selected ? { background: "linear-gradient(180deg, rgba(255,255,255,.7), rgba(255,255,255,.3))", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.9)" } : {}}>
      <div className="row1">
        <div className="color-chip" style={{ background: `linear-gradient(180deg, ${track.color}, ${track.color}aa)` }}/>
        <div className="name">{track.name}</div>
        <div className="msa">
          <button className={`m ${track.mute ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); onToggle("mute"); }}>M</button>
          <button className={`s ${track.solo ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); onToggle("solo"); }}>S</button>
          <button className={`a ${track.arm ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); onToggle("arm"); }}>●</button>
        </div>
      </div>
      <div className="row2">
        <PanKnob value={track.pan} onChange={onPan}/>
        <FaderMini value={track.vol} onChange={onVol}/>
        <div style={{ width: 12, height: 34 }}><VUMeter level={meter}/></div>
      </div>
      <div style={{ fontSize: 9.5, color: "var(--ink-soft)", fontFamily: "Consolas, monospace" }}>
        {track.kind.toUpperCase()} · {track.clips.length} clips
      </div>
    </div>
  );
}

function Lane({ track, onClipClick, onClipDouble, selectedClip, onDropSample }) {
  const [over, setOver] = useState(false);
  return (
    <div className="lane"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const rect = e.currentTarget.getBoundingClientRect();
        const beats = (e.clientX - rect.left) / PX_PER_BEAT;
        const name = e.dataTransfer.getData("text/plain") || window.__drag || "New Clip";
        onDropSample(beats, name);
      }}
      style={over ? { boxShadow: "inset 0 0 0 2px var(--accent)" } : {}}>
      {track.clips.map(c => (
        <div key={c.id}
          className={`clip ${selectedClip === c.id ? "selected" : ""}`}
          style={{
            left: c.start * PX_PER_BAR,
            width: c.len * PX_PER_BAR,
            background: `linear-gradient(180deg, ${c.color} 0%, ${c.color}dd 48%, ${darken(c.color, 30)} 50%, ${c.color}ee 100%)`,
          }}
          onClick={(e) => { e.stopPropagation(); onClipClick(c); }}
          onDoubleClick={() => onClipDouble(c)}
          title={c.name + (c.midi ? " (double-click for piano roll)" : "")}>
          <div className="clip-head">
            {c.midi && <span style={{ marginRight: 4 }}>♪</span>}
            {c.name}
          </div>
          <div className="wave-area">
            <WaveformSVG seed={c.seed} midi={c.midi} color={c.color}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function darken(hex, amt) {
  // very naive darken
  const c = hex.replace("#", "");
  const n = parseInt(c, 16);
  let r = (n >> 16) - amt, g = ((n >> 8) & 0xff) - amt, b = (n & 0xff) - amt;
  r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

// --- Devices ---
function DeviceShell({ title, led, children }) {
  return (
    <div className="device">
      <div className="device-head">
        <LED color={led || "green"}/>
        <div className="device-title">{title}</div>
        <button className="tbtn" style={{ width: 20, height: 16, fontSize: 9 }}>▾</button>
      </div>
      {children}
    </div>
  );
}

function EQDevice() {
  const [bands, setBands] = useState({ low: 0.55, lm: 0.5, hm: 0.5, hi: 0.65 });
  const set = (k) => (v) => setBands({ ...bands, [k]: v });
  return (
    <DeviceShell title="EQ Eight" led="blue">
      <div style={{
        height: 54, margin: "0 2px 6px", borderRadius: 6,
        background: "linear-gradient(180deg,#0a1a10,#143022)",
        border: "1px solid #000", position: "relative", overflow: "hidden"
      }}>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="eqg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="rgba(120,255,170,.8)"/>
              <stop offset="1" stopColor="rgba(120,255,170,.1)"/>
            </linearGradient>
          </defs>
          {[...Array(5)].map((_, i) => <line key={i} x1="0" x2="100" y1={8 * (i + 1)} y2={8 * (i + 1)} stroke="rgba(120,255,170,.12)" strokeWidth=".3"/>)}
          <path d={`M0 ${40 - bands.low * 30} Q25 ${40 - bands.lm * 35}, 50 ${40 - bands.hm * 30} T100 ${40 - bands.hi * 35}`}
            stroke="#8cff9e" strokeWidth="1" fill="url(#eqg)" vectorEffect="non-scaling-stroke"/>
        </svg>
      </div>
      <div className="knobs">
        <Knob value={bands.low} onChange={set("low")} label="LOW"/>
        <Knob value={bands.lm} onChange={set("lm")} label="LO-MID"/>
        <Knob value={bands.hm} onChange={set("hm")} label="HI-MID"/>
        <Knob value={bands.hi} onChange={set("hi")} label="HIGH"/>
      </div>
    </DeviceShell>
  );
}

function ReverbDevice() {
  const [p, setP] = useState({ size: 0.6, decay: 0.5, mix: 0.3, damp: 0.4 });
  const set = (k) => (v) => setP({ ...p, [k]: v });
  return (
    <DeviceShell title="Glass Reverb" led="blue">
      <div style={{
        height: 54, margin: "0 2px 6px", borderRadius: 6,
        background: "linear-gradient(180deg,#0a1a10,#143022)",
        border: "1px solid #000", position: "relative",
        display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, padding: 4
      }}>
        {[...Array(24)].map((_, i) => {
          const h = Math.pow(1 - i / 24, 1.5 - p.decay) * 46 * (0.5 + p.size * 0.5);
          return <div key={i} style={{
            width: 3, height: h,
            background: `linear-gradient(180deg, #8cffbf, rgba(80,230,140,${0.2 + p.mix * 0.6}))`,
            borderRadius: 1
          }}/>;
        })}
      </div>
      <div className="knobs">
        <Knob value={p.size} onChange={set("size")} label="SIZE"/>
        <Knob value={p.decay} onChange={set("decay")} label="DECAY"/>
        <Knob value={p.damp} onChange={set("damp")} label="DAMP"/>
        <Knob value={p.mix} onChange={set("mix")} label="MIX"/>
      </div>
    </DeviceShell>
  );
}

function CompressorDevice() {
  const [p, setP] = useState({ thr: 0.55, ratio: 0.4, atk: 0.3, rel: 0.5 });
  const set = (k) => (v) => setP({ ...p, [k]: v });
  return (
    <DeviceShell title="Glue Comp" led="amber">
      <div style={{
        height: 54, margin: "0 2px 6px", borderRadius: 6,
        background: "linear-gradient(180deg,#0a1a10,#143022)",
        border: "1px solid #000", position: "relative", overflow: "hidden"
      }}>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          <line x1="0" y1="40" x2="100" y2="0" stroke="rgba(120,255,170,.2)" strokeWidth=".3"/>
          <line x1="0" y1="40" x2={p.thr * 100} y2={40 - p.thr * 40} stroke="#ffd27a" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
          <line x1={p.thr * 100} y1={40 - p.thr * 40} x2="100" y2={40 - p.thr * 40 - (1 - p.ratio) * (40 - p.thr * 40)} stroke="#ffd27a" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
          <circle cx={p.thr * 100} cy={40 - p.thr * 40} r="1.5" fill="#ffd27a"/>
        </svg>
      </div>
      <div className="knobs">
        <Knob value={p.thr} onChange={set("thr")} label="THRESH"/>
        <Knob value={p.ratio} onChange={set("ratio")} label="RATIO"/>
        <Knob value={p.atk} onChange={set("atk")} label="ATK"/>
        <Knob value={p.rel} onChange={set("rel")} label="REL"/>
      </div>
    </DeviceShell>
  );
}

function AddDeviceSlot() {
  return (
    <div style={{
      flexShrink: 0, width: 140, borderRadius: 8,
      border: "1.5px dashed rgba(0,0,0,.25)",
      background: "linear-gradient(180deg, rgba(255,255,255,.25), rgba(255,255,255,.08))",
      display: "grid", placeItems: "center",
      color: "var(--ink-soft)", fontSize: 12, fontWeight: 600,
      cursor: "pointer"
    }}>
      + Drop Device
    </div>
  );
}

function SpectrumAnalyzer({ playing, level }) {
  const [bars, setBars] = useState(() => Array(32).fill(0));
  useEffect(() => {
    const iv = setInterval(() => {
      setBars(prev => prev.map((v, i) => {
        const target = playing
          ? (Math.sin(Date.now() / (800 + i * 30) + i) * 0.3 + 0.5) * (1 - i / 60) * (0.5 + level * 0.8)
          : Math.max(0, v - 0.05);
        return v + (target - v) * 0.4;
      }));
    }, 60);
    return () => clearInterval(iv);
  }, [playing, level]);
  return (
    <div className="spectrum">
      <div className="grid"/>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="specg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#b6ffcf"/>
            <stop offset=".5" stopColor="#4fd089"/>
            <stop offset="1" stopColor="rgba(80,200,140,.1)"/>
          </linearGradient>
        </defs>
        {bars.map((v, i) => {
          const h = Math.max(0.5, v * 38);
          return <rect key={i} x={i * (100 / bars.length) + 0.3} y={40 - h} width={(100 / bars.length) - 0.6} height={h} fill="url(#specg)"/>;
        })}
      </svg>
    </div>
  );
}

function TweaksPanel({ open, tweaks, setTweak }) {
  if (!open) return null;
  const hues = [
    { name: "Green",  h: 155 },
    { name: "Aqua",   h: 200 },
    { name: "Blue",   h: 250 },
    { name: "Pink",   h: 340 },
    { name: "Amber",  h: 75 },
  ];
  return (
    <div className="tweaks glass open">
      <h4>Tweaks</h4>
      <label>Aero Intensity</label>
      <input type="range" min="0" max="1" step="0.05" value={tweaks.aeroIntensity}
        onChange={e => setTweak("aeroIntensity", +e.target.value)}/>
      <label>Glossiness</label>
      <input type="range" min="0" max="1" step="0.05" value={tweaks.gloss}
        onChange={e => setTweak("gloss", +e.target.value)}/>
      <label>Accent Hue</label>
      <div className="swatches">
        {hues.map(h => (
          <div key={h.h} className={`swatch ${tweaks.accentHue === h.h ? "on" : ""}`}
            title={h.name}
            style={{ background: `oklch(0.78 0.17 ${h.h})` }}
            onClick={() => setTweak("accentHue", h.h)}/>
        ))}
      </div>
      <label>Theme</label>
      <div className="seg-ctrl" style={{ width: "100%" }}>
        <button className={tweaks.theme === "day" ? "on" : ""} onClick={() => setTweak("theme", "day")} style={{ flex: 1 }}>Day</button>
        <button className={tweaks.theme === "sunset" ? "on" : ""} onClick={() => setTweak("theme", "sunset")} style={{ flex: 1 }}>Sunset</button>
        <button className={tweaks.theme === "night" ? "on" : ""} onClick={() => setTweak("theme", "night")} style={{ flex: 1 }}>Night</button>
      </div>
    </div>
  );
}


// ─── PIN Screen ────────────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState(false);
  const [unlocking, setUnlocking] = React.useState(false);

  const press = React.useCallback((d) => {
    if (unlocking || pin.length >= 8) return;
    setPin(p => p + d);
    setError(false);
  }, [pin, unlocking]);

  const backspace = React.useCallback(() => {
    setPin(p => p.slice(0, -1));
    setError(false);
  }, []);

  const submit = React.useCallback(() => {
    if (pin === '777') {
      setUnlocking(true);
      setTimeout(onUnlock, 650);
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 600);
    }
  }, [pin, onUnlock]);

  React.useEffect(() => {
    const down = (e) => {
      if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Enter') submit();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [press, backspace, submit]);

  const dotCount = Math.max(3, pin.length + (unlocking ? 0 : 1));

  return (
    <div className={`pin-screen${unlocking ? ' unlocking' : ''}`}>
      <div className="pin-orbs">
        <div className="pin-orb pin-orb-1"/>
        <div className="pin-orb pin-orb-2"/>
        <div className="pin-orb pin-orb-3"/>
      </div>

      <div className={`pin-card${error ? ' shake' : ''}`}>
        <div className="pin-logo-wrap">
          <div className="pin-logo-mark">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M8 14 L12 8 L18 20 L22 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="14" cy="14" r="3" fill="white" opacity=".9"/>
            </svg>
          </div>
          <div className="pin-logo-name">NEXA</div>
          <div className="pin-logo-sub">Digital Audio Workstation</div>
        </div>

        <div className="pin-sep"/>
        <p className="pin-hint">Enter PIN to unlock</p>

        <div className="pin-dots">
          {Array.from({ length: dotCount }, (_, i) => (
            <span key={i} className={`pin-dot${i < pin.length ? ' filled' : ''}`}/>
          ))}
        </div>

        <div className="pin-pad">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="pin-key" onClick={() => press(String(n))}>{n}</button>
          ))}
          <button className="pin-key" onClick={backspace}>
            <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
              <path d="M6 1L1 6.5L6 12M1 6.5H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="pin-key" onClick={() => press('0')}>0</button>
          <button className="pin-key pin-key-enter" onClick={submit}>
            <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
              <path d="M1 1H11V6.5M11 6.5L7 2.5M11 6.5L7 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {error && <p className="pin-error">Incorrect PIN — try again</p>}
        {unlocking && <p className="pin-unlocking">Unlocking…</p>}
      </div>

      <p className="pin-version">NEXA DAW · Browser Edition</p>
    </div>
  );
}

function PinApp() {
  const [unlocked, setUnlocked] = React.useState(false);
  return unlocked ? <App /> : <PinScreen onUnlock={() => setUnlocked(true)} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<PinApp/>);
