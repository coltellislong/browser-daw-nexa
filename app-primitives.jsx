// AeroTrack DAW — main app
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- Data ----------
const TRACKS_INIT = [
  { id: "t1", name: "Drums",  color: "#ff7a3a", kind: "audio", vol: 0.82, pan: 0,    mute: false, solo: false, arm: false,
    clips: [
      { id: "c1", start: 0,  len: 8,  name: "Kick Loop A",   color: "#ff9e5e", seed: 11 },
      { id: "c2", start: 8,  len: 8,  name: "Kick+Hat",      color: "#ff7a3a", seed: 12 },
      { id: "c3", start: 16, len: 16, name: "Full Beat",     color: "#ff5e1a", seed: 13 },
    ]},
  { id: "t2", name: "Bass",   color: "#c56aff", kind: "audio", vol: 0.70, pan: -0.1, mute: false, solo: false, arm: false,
    clips: [
      { id: "c4", start: 4,  len: 12, name: "Sub Bass",      color: "#b44dff", seed: 21 },
      { id: "c5", start: 20, len: 12, name: "808 Slide",     color: "#9a2fe8", seed: 22 },
    ]},
  { id: "t3", name: "Synth",  color: "#5cd6ff", kind: "midi",  vol: 0.65, pan: 0.15, mute: false, solo: false, arm: false,
    clips: [
      { id: "c6", start: 0,  len: 16, name: "Pad Chords",    color: "#7ae0ff", seed: 31, midi: true },
      { id: "c7", start: 16, len: 16, name: "Lead Arp",      color: "#3cb7e3", seed: 32, midi: true },
    ]},
  { id: "t4", name: "Vocals", color: "#8ff77a", kind: "audio", vol: 0.75, pan: 0,    mute: false, solo: false, arm: true,
    clips: [
      { id: "c8", start: 8,  len: 10, name: "Verse Take 3",  color: "#a6ff8f", seed: 41 },
      { id: "c9", start: 20, len: 12, name: "Chorus Dbl",    color: "#6ad95a", seed: 42 },
    ]},
];

const BROWSER_FOLDERS = [
  { name: "Drums", open: true, samples: ["808 Kick.wav","Snare Hit 01.wav","Closed Hat.wav","Open Hat.wav","Clap Vintage.wav","Tom Low.wav","Perc Shaker.wav","Rim Click.wav"] },
  { name: "Bass",  open: false, samples: ["Sub Bass C1.wav","Reese Loop.wav","Pluck Bass.wav","Moog Bass.wav"] },
  { name: "Synths", open: false, samples: ["Analog Pad.wav","Super Saw.wav","Pluck Bell.wav","FM Keys.wav","Ambient Drone.wav"] },
  { name: "FX", open: false, samples: ["Riser Long.wav","Impact 01.wav","Vinyl Crackle.wav","Reverse Sweep.wav"] },
  { name: "Vocals", open: false, samples: ["Ad Lib 01.wav","Yeah Shout.wav","Vocoder Phrase.wav"] },
];

const PX_PER_BEAT = 20;
const BEATS_PER_BAR = 4;
const TOTAL_BARS = 48;
const PX_PER_BAR = PX_PER_BEAT * BEATS_PER_BAR;

// Seeded random for stable waveforms
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ---------- Utilities ----------
function fmtBarsBeats(beats) {
  const bar = Math.floor(beats / BEATS_PER_BAR) + 1;
  const beat = Math.floor(beats % BEATS_PER_BAR) + 1;
  const tick = Math.floor((beats % 1) * 4) + 1;
  return `${bar}.${beat}.${tick}`;
}

// ---------- Waveform SVG ----------
function WaveformSVG({ seed, color = "#ffffff", midi = false, width = 400 }) {
  const points = useMemo(() => {
    const rnd = seededRand(seed);
    const n = 120;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const base = Math.sin(i * 0.25 + seed) * 0.3 + 0.5;
      const noise = rnd() * 0.5;
      arr.push(Math.min(1, base * 0.6 + noise * 0.6));
    }
    return arr;
  }, [seed]);

  if (midi) {
    // Render little note blocks
    const rnd = seededRand(seed);
    const notes = [];
    for (let i = 0; i < 24; i++) {
      notes.push({ x: rnd() * 0.95, y: 0.15 + rnd() * 0.7, w: 0.03 + rnd() * 0.08 });
    }
    return (
      <svg className="wave-svg" viewBox="0 0 100 50" preserveAspectRatio="none">
        {notes.map((n, i) => (
          <rect key={i} x={n.x * 100} y={n.y * 50} width={n.w * 100} height={2.5} fill="rgba(0,0,0,.6)" rx=".6"/>
        ))}
      </svg>
    );
  }

  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * 100;
    const top = 25 - v * 22;
    const bot = 25 + v * 22;
    return `M${x.toFixed(2)} ${top.toFixed(2)} L${x.toFixed(2)} ${bot.toFixed(2)}`;
  }).join(" ");

  return (
    <svg className="wave-svg" viewBox="0 0 100 50" preserveAspectRatio="none">
      <path d={path} stroke="rgba(0,0,0,.55)" strokeWidth=".6" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

// ---------- Small UI bits ----------
function LED({ color = "green", on = true }) {
  const cls = on ? color : "off";
  return <span className={`led ${cls}`} />;
}

function VUMeter({ level }) {
  const segs = 18;
  return (
    <div className="vu">
      {Array.from({ length: segs }).map((_, i) => {
        const on = (i / segs) < level;
        const cls = i > segs * 0.85 ? "hot" : i > segs * 0.65 ? "mid" : "";
        return <div key={i} className={`seg ${on ? "on" : ""} ${cls}`} />;
      })}
    </div>
  );
}

function VUMeterTall({ level }) {
  const segs = 28;
  return (
    <div className="vu-tall">
      {Array.from({ length: segs }).map((_, i) => {
        const on = (i / segs) < level;
        const cls = i > segs * 0.85 ? "hot" : i > segs * 0.65 ? "mid" : "";
        return <div key={i} className={`seg ${on ? "on" : ""} ${cls}`} />;
      })}
    </div>
  );
}

function Knob({ value, onChange, label, min = 0, max = 1 }) {
  const ref = useRef(null);
  const ang = -135 + 270 * ((value - min) / (max - min));
  const onDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startV = value;
    const move = (ev) => {
      const dy = startY - ev.clientY;
      const next = Math.max(min, Math.min(max, startV + (dy / 120) * (max - min)));
      onChange(next);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  return (
    <div className="knob" ref={ref}>
      <div className="dial" style={{ "--ang": `${ang}deg` }} onMouseDown={onDown} title={label}/>
      <div className="lbl">{label}</div>
    </div>
  );
}

function PanKnob({ value, onChange }) {
  const ang = value * 135;
  const onDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startV = value;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      onChange(Math.max(-1, Math.min(1, startV + dx / 80)));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  return <div className="pan-knob" style={{ "--ang": `${ang}deg` }} onMouseDown={onDown} title={`Pan ${value.toFixed(2)}`}/>;
}

function FaderMini({ value, onChange }) {
  const ref = useRef(null);
  const onDown = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const update = (clientX) => {
      const v = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChange(v);
    };
    update(e.clientX);
    const move = (ev) => update(ev.clientX);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  return (
    <div className="fader-mini" ref={ref} onMouseDown={onDown}>
      <div className="fill" style={{ width: `${value * 100}%` }} />
      <div className="knob" style={{ left: `${value * 100}%` }} />
    </div>
  );
}

function FaderTall({ value, onChange }) {
  const ref = useRef(null);
  const onDown = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const update = (clientY) => {
      const v = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      onChange(v);
    };
    update(e.clientY);
    const move = (ev) => update(ev.clientY);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const capTop = (1 - value) * (170 - 28);
  return (
    <div className="fader-tall" ref={ref} onMouseDown={onDown} title={`${Math.round(value * 100)}%`}>
      <div className="track-slot"/>
      <div className="cap" style={{ top: capTop }}/>
    </div>
  );
}

// Make these available to other files
Object.assign(window, {
  TRACKS_INIT, BROWSER_FOLDERS, PX_PER_BEAT, PX_PER_BAR, BEATS_PER_BAR, TOTAL_BARS,
  seededRand, fmtBarsBeats,
  WaveformSVG, LED, VUMeter, VUMeterTall, Knob, PanKnob, FaderMini, FaderTall
});
