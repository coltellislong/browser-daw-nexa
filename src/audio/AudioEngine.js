import * as Tone from 'tone';

class AudioEngine {
  constructor() {
    this.started = false;
    this.players = new Map();
    this.gainNodes = new Map();
    this.panNodes = new Map();
    this.sampleBuffers = new Map();
    this.masterGain = null;
    this.analyserData = new Float32Array(256);
  }

  async ensureStarted() {
    if (!this.started) {
      await Tone.start();
      this.masterGain = new Tone.Gain(0.85).toDestination();
      this.started = true;
    }
  }

  createTrackNodes(trackId, volume = 0.75, pan = 0) {
    if (!this.masterGain) return;
    const gainNode = new Tone.Gain(volume);
    const panNode = new Tone.Panner(pan);
    panNode.connect(gainNode);
    gainNode.connect(this.masterGain);
    this.gainNodes.set(trackId, gainNode);
    this.panNodes.set(trackId, panNode);
  }

  setVolume(trackId, volume) {
    const g = this.gainNodes.get(trackId);
    if (g) g.gain.rampTo(volume, 0.05);
  }

  setPan(trackId, pan) {
    const p = this.panNodes.get(trackId);
    if (p) p.pan.rampTo(pan, 0.05);
  }

  setMasterVolume(volume) {
    if (this.masterGain) this.masterGain.gain.rampTo(volume, 0.05);
  }

  async loadSampleFromFile(file) {
    await this.ensureStarted();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const audioCtx = Tone.getContext().rawContext;
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
          const id = `sample-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          this.sampleBuffers.set(id, toneBuffer);
          resolve({ id, name: file.name, duration: audioBuffer.duration });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  playClip(trackId, sampleId, loop = false) {
    const buffer = this.sampleBuffers.get(sampleId);
    const panner = this.panNodes.get(trackId);
    if (!buffer || !panner) return;

    this.stopTrack(trackId);

    const player = new Tone.Player({ loop, autostart: true });
    player.buffer = buffer;
    player.connect(panner);
    this.players.set(trackId, player);
  }

  stopTrack(trackId) {
    const p = this.players.get(trackId);
    if (p) {
      try { p.stop(); p.dispose(); } catch (_) {}
      this.players.delete(trackId);
    }
  }

  stopAll() {
    for (const trackId of this.players.keys()) this.stopTrack(trackId);
    Tone.Transport.stop();
  }

  startTransport(bpm) {
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.start();
  }

  stopTransport() {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
  }

  setBpm(bpm) {
    Tone.Transport.bpm.value = bpm;
  }

  getTransportPosition() {
    return Tone.Transport.seconds;
  }
}

export const audioEngine = new AudioEngine();
