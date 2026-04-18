// Modals: Drive import, Export, Piano roll

function DriveImportModal({ onClose, onImport }) {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState(new Set());

  const FAKE_FOLDERS = [
    { name: "🗂 My Project Samples", files: ["Loop_Guitar_Dmin_120.wav","Vox_Adlib_01.wav","Synth_Pad_Warm.wav","Sub_808_F.wav","Hat_Tight_01.wav","Snap_Layered.wav"] },
    { name: "🗂 Tutorial Packs", files: ["Kick_Punchy.wav","Rim_Click.wav","Bell_Bright.wav"] },
  ];
  const [expandedFolder, setExpandedFolder] = useState(0);

  const toggle = (key) => {
    const n = new Set(selected);
    n.has(key) ? n.delete(key) : n.add(key);
    setSelected(n);
  };

  const next = () => {
    if (step === 1) {
      if (!url.trim()) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      const files = [];
      for (const key of selected) {
        const [fi, ni] = key.split(":").map(Number);
        files.push(FAKE_FOLDERS[fi].files[ni]);
      }
      onImport(files);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal glass" onClick={e => e.stopPropagation()}>
        <div className="m-head">
          <div className="gicon" style={{ width: 20, height: 18,
            background: "conic-gradient(from 120deg at 50% 55%, #0f9d58 0 33%, #f4b400 0 66%, #4285f4 0 100%)",
            clipPath: "polygon(50% 0, 100% 100%, 0 100%)", borderRadius: 2 }}/>
          <span>Import from Drive Folder</span>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Step {step} of 3</div>
        </div>
        <div className="m-body">
          {step === 1 && (
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12 }}>
                Paste a shared folder link. Make sure link sharing is set to <b>Anyone with the link</b>.
              </div>
              <label className="field-label">Folder Share URL</label>
              <input
                className="input"
                placeholder="https://drive.example.com/drive/folders/..."
                value={url} onChange={e => setUrl(e.target.value)}
                autoFocus
              />
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-soft)" }}>
                Supported: .wav, .mp3, .aiff, .flac — up to 250 MB / file.
              </div>
            </div>
          )}
          {step === 2 && (
            <div style={{ textAlign: "center", padding: "12px 4px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green-deep)", marginBottom: 6 }}>
                AeroTrack wants to access your Drive
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 16 }}>
                Read-only access to the folder you shared. You can revoke anytime.
              </div>
              <div style={{
                background: "linear-gradient(180deg, #fff, #eaf2ed)",
                border: "1px solid rgba(0,0,0,.15)", borderRadius: 8,
                padding: 14, textAlign: "left", fontSize: 12
              }}>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Permissions requested</div>
                <div style={{ marginBottom: 4 }}>✓ View files in the shared folder</div>
                <div style={{ marginBottom: 4 }}>✓ Download audio files to this session</div>
                <div style={{ color: "var(--ink-soft)" }}>✗ No write access, no other folders</div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8 }}>
                Pick samples to import, then drag them onto a track.
              </div>
              <div style={{ maxHeight: 260, overflow: "auto",
                background: "linear-gradient(180deg, rgba(255,255,255,.6), rgba(255,255,255,.2))",
                border: "1px solid rgba(255,255,255,.7)", borderRadius: 8, padding: 6 }}>
                {FAKE_FOLDERS.map((f, fi) => (
                  <div key={fi} className={`folder ${expandedFolder === fi ? "open" : ""}`}>
                    <div className="folder-head" onClick={() => setExpandedFolder(expandedFolder === fi ? -1 : fi)}>
                      <span className="caret">▶</span>{f.name}
                    </div>
                    <div className="folder-items">
                      {f.files.map((name, ni) => {
                        const key = `${fi}:${ni}`;
                        const on = selected.has(key);
                        return (
                          <label key={ni} className="sample" style={{ cursor: "pointer" }}>
                            <input type="checkbox" checked={on} onChange={() => toggle(key)}
                              style={{ marginRight: 2 }}/>
                            <span className="wave"/>
                            {name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--ink-soft)" }}>
                {selected.size} selected
              </div>
            </div>
          )}
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={next}
            disabled={step === 3 && selected.size === 0}>
            {step === 1 ? "Connect" : step === 2 ? "Authorize" : `Import ${selected.size || ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ onClose, onDone }) {
  const [format, setFormat] = useState("wav");
  const [quality, setQuality] = useState("high");
  const [name, setName] = useState("AeroDemo_v1");
  const [stage, setStage] = useState("config"); // config | rendering | done
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (stage !== "rendering") return;
    const iv = setInterval(() => {
      setProgress(p => {
        const next = p + 2 + Math.random() * 5;
        if (next >= 100) { clearInterval(iv); setStage("done"); return 100; }
        return next;
      });
    }, 90);
    return () => clearInterval(iv);
  }, [stage]);

  const fakeDownload = () => {
    const content = `AeroTrack Demo Export\nFile: ${name}.${format}\nQuality: ${quality}\n\n(This is a placeholder demo file.)`;
    const blob = new Blob([content], { type: format === "mp3" ? "audio/mpeg" : "audio/wav" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.${format}`;
    a.click();
    onDone && onDone();
  };

  return (
    <div className="modal-backdrop" onClick={stage !== "rendering" ? onClose : undefined}>
      <div className="modal glass" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="m-head">
          <span>Export Demo</span>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
            {stage === "config" ? "Configure" : stage === "rendering" ? "Rendering" : "Complete"}
          </div>
        </div>
        <div className="m-body">
          {stage === "config" && (
            <>
              <label className="field-label">File name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} />
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Format</label>
                  <div className="seg-ctrl">
                    <button className={format === "wav" ? "on" : ""} onClick={() => setFormat("wav")}>.WAV</button>
                    <button className={format === "mp3" ? "on" : ""} onClick={() => setFormat("mp3")}>.MP3</button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Quality</label>
                  <div className="seg-ctrl">
                    <button className={quality === "standard" ? "on" : ""} onClick={() => setQuality("standard")}>Std</button>
                    <button className={quality === "high" ? "on" : ""} onClick={() => setQuality("high")}>High</button>
                    <button className={quality === "master" ? "on" : ""} onClick={() => setQuality("master")}>Master</button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--ink-soft)" }}>
                {format === "wav" ? "44.1 kHz / 16-bit stereo PCM" : "320 kbps joint stereo"} — approx. {(Math.random()*10+3).toFixed(1)} MB
              </div>
            </>
          )}
          {stage === "rendering" && (
            <>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8 }}>
                Bouncing tracks to {format.toUpperCase()}…
              </div>
              <div className="prog"><div className="fill" style={{ width: `${progress}%` }}/></div>
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-soft)", fontFamily: "Consolas, monospace" }}>
                {progress.toFixed(0)}% — {Math.floor((100 - progress) / 8)}s remaining
              </div>
            </>
          )}
          {stage === "done" && (
            <div style={{ textAlign: "center", padding: "14px 0" }}>
              <div style={{
                width: 56, height: 56, margin: "0 auto 10px", borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #fff, #4fd089 50%, #1a8a4a 100%)",
                boxShadow: "0 0 20px rgba(80,230,140,.8), 0 1px 0 rgba(255,255,255,.9) inset",
                display: "grid", placeItems: "center", fontSize: 26, color: "#0a2a18"
              }}>✓</div>
              <div style={{ fontWeight: 700, color: "var(--green-deep)" }}>Export Complete</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
                {name}.{format} is ready to download.
              </div>
            </div>
          )}
        </div>
        <div className="m-foot">
          {stage === "config" && (<>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={() => { setStage("rendering"); setProgress(0); }}>Start Export</button>
          </>)}
          {stage === "rendering" && (<>
            <button className="btn" disabled>Cancel</button>
            <button className="btn primary" disabled>Rendering…</button>
          </>)}
          {stage === "done" && (<>
            <button className="btn" onClick={onClose}>Close</button>
            <button className="btn primary" onClick={fakeDownload}>Download</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

function PianoRollModal({ clip, onClose }) {
  const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const keys = [];
  for (let o = 5; o >= 3; o--) {
    for (let n = 11; n >= 0; n--) {
      const nm = NOTE_NAMES[n];
      keys.push({ label: `${nm}${o}`, black: nm.includes("#") });
    }
  }
  // Generate notes from clip seed
  const notes = useMemo(() => {
    const rnd = seededRand(clip.seed || 99);
    const out = [];
    const total = 32;
    for (let i = 0; i < total; i++) {
      const pitch = Math.floor(rnd() * 20) + 6;
      const start = i * (rnd() * 0.5 + 0.5);
      const len = rnd() * 2 + 0.5;
      out.push({ pitch, start, len });
    }
    return out;
  }, [clip]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal glass piano-roll" onClick={e => e.stopPropagation()}>
        <div className="m-head">
          <span>Piano Roll — {clip.name}</span>
          <div style={{ flex: 1 }}/>
          <button className="btn" onClick={onClose} style={{ padding: "3px 10px" }}>✕</button>
        </div>
        <div className="pr-body">
          <div className="keys">
            {keys.map((k, i) => (
              <div key={i} className={`key ${k.black ? "black" : ""}`}>{k.label}</div>
            ))}
          </div>
          <div className="notes-area">
            <div style={{ position: "relative", width: 1200, height: keys.length * 16 }}>
              {notes.map((n, i) => (
                <div key={i} className="note"
                  style={{
                    left: n.start * 40,
                    top: n.pitch * 16 + 1,
                    width: n.len * 40,
                  }}/>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DriveImportModal, ExportModal, PianoRollModal });
