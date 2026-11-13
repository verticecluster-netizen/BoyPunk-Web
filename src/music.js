export const GAMEPLAY_MUSIC = Object.freeze({
  title: "Pulso do Distrito",
  composer: "Composição original por código para BoyPunk! Web",
  bpm: 130,
  bars: 16,
  beatsPerBar: 4,
  key: "Ré menor",
  progression: "Dm–Bb–F–C / Dm–Bb–C–A",
  sampleRate: 24000,
  duration: (16 * 4 * 60) / 130
});

const midiToHz = (note) => 440 * (2 ** ((note - 69) / 12));

function seededNoise(length) {
  const data = new Float32Array(length);
  let seed = 0x4250594b;
  for (let index = 0; index < length; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[index] = (seed / 0xffffffff) * 2 - 1;
  }
  return data;
}

function envelope(parameter, time, duration, peak, release = 0.08) {
  const end = Math.max(time + 0.025, time + duration - release);
  parameter.setValueAtTime(0.0001, time);
  parameter.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.012);
  parameter.setValueAtTime(Math.max(0.0002, peak * 0.82), end);
  parameter.exponentialRampToValueAtTime(0.0001, time + duration);
}

function addTone(context, destination, { note, time, duration, gain, type = "sawtooth", cutoff = 1600, detune = 0 }) {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const voice = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = midiToHz(note);
  oscillator.detune.value = detune;
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  filter.Q.value = 1.2;
  envelope(voice.gain, time, duration, gain);
  oscillator.connect(filter).connect(voice).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.02);
}

function addKick(context, destination, time, gain = 0.42) {
  const oscillator = context.createOscillator();
  const voice = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(118, time);
  oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.13);
  voice.gain.setValueAtTime(gain, time);
  voice.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
  oscillator.connect(voice).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + 0.24);
}

function addNoiseHit(context, destination, noiseBuffer, time, { highpass, lowpass, duration, gain }) {
  const source = context.createBufferSource();
  const high = context.createBiquadFilter();
  const low = context.createBiquadFilter();
  const voice = context.createGain();
  source.buffer = noiseBuffer;
  high.type = "highpass";
  high.frequency.value = highpass;
  low.type = "lowpass";
  low.frequency.value = lowpass;
  voice.gain.setValueAtTime(gain, time);
  voice.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(high).connect(low).connect(voice).connect(destination);
  source.start(time);
  source.stop(time + duration);
}

function scheduleBar(context, destination, noiseBuffer, bar, beatDuration) {
  const start = bar * 4 * beatDuration;
  const section = Math.floor(bar / 4);
  const progressionA = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]];
  const progressionB = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]];
  const chord = (bar < 12 ? progressionA : progressionB)[bar % 4];
  const root = chord[0] - 12;

  for (let beat = 0; beat < 4; beat += 1) {
    const at = start + beat * beatDuration + 0.008;
    if (beat === 0 || beat === 2 || (section >= 1 && beat === 3 && bar % 2 === 1)) addKick(context, destination, at);
    if (beat === 1 || beat === 3) {
      addNoiseHit(context, destination, noiseBuffer, at, { highpass: 680, lowpass: 6800, duration: 0.16, gain: 0.17 });
      addTone(context, destination, { note: 62, time: at, duration: 0.07, gain: 0.035, type: "triangle", cutoff: 2800 });
    }
    for (let half = 0; half < 2; half += 1) {
      addNoiseHit(context, destination, noiseBuffer, at + half * beatDuration * 0.5, {
        highpass: 5200, lowpass: 11000, duration: 0.045, gain: half === 0 ? 0.055 : 0.038
      });
    }
  }

  const bassPattern = [0, 0, 7, 0, 12, 7, 0, bar % 4 === 3 ? 11 : 7];
  bassPattern.forEach((offset, step) => {
    const at = start + step * beatDuration * 0.5 + 0.012;
    addTone(context, destination, { note: root + offset, time: at, duration: beatDuration * 0.42, gain: 0.115, type: "sawtooth", cutoff: 360 });
    addTone(context, destination, { note: root + offset, time: at, duration: beatDuration * 0.40, gain: 0.045, type: "square", cutoff: 260, detune: -5 });
  });

  [0, 2.5].forEach((beat, index) => {
    chord.forEach((note, voiceIndex) => addTone(context, destination, {
      note: note + 12,
      time: start + beat * beatDuration + 0.015,
      duration: beatDuration * (index === 0 ? 0.62 : 0.42),
      gain: 0.027,
      type: voiceIndex === 1 ? "triangle" : "sawtooth",
      cutoff: 1750 + section * 180,
      detune: voiceIndex === 2 ? 5 : 0
    }));
  });

  const motifA = [62, null, 65, 69, 67, null, 65, 62];
  const motifB = [62, 65, 67, null, 69, 67, 65, null];
  const motif = bar % 4 < 2 ? motifA : motifB;
  const leadEnabled = section === 1 || section === 3 || (section === 0 && bar >= 2);
  if (leadEnabled) {
    motif.forEach((note, step) => {
      if (note === null || (section === 0 && step % 2 === 1)) return;
      const at = start + step * beatDuration * 0.5 + 0.018;
      addTone(context, destination, { note, time: at, duration: beatDuration * 0.31, gain: 0.042, type: "square", cutoff: 2500 });
      addTone(context, destination, { note: note + 12, time: at, duration: beatDuration * 0.27, gain: 0.012, type: "triangle", cutoff: 3600, detune: 6 });
    });
  }
}

export async function renderGameplayMusic() {
  const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Offline) throw new Error("Síntese offline de áudio não está disponível neste navegador.");
  const frameCount = Math.ceil(GAMEPLAY_MUSIC.duration * GAMEPLAY_MUSIC.sampleRate);
  const context = new Offline(2, frameCount, GAMEPLAY_MUSIC.sampleRate);
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  master.gain.value = 0.72;
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.16;
  master.connect(compressor).connect(context.destination);

  const noiseBuffer = context.createBuffer(1, Math.ceil(GAMEPLAY_MUSIC.sampleRate * 0.3), GAMEPLAY_MUSIC.sampleRate);
  noiseBuffer.copyToChannel(seededNoise(noiseBuffer.length), 0);
  const beatDuration = 60 / GAMEPLAY_MUSIC.bpm;
  for (let bar = 0; bar < GAMEPLAY_MUSIC.bars; bar += 1) scheduleBar(context, master, noiseBuffer, bar, beatDuration);

  const buffer = await context.startRendering();
  let peak = 0;
  let sumSquares = 0;
  let samples = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      peak = Math.max(peak, Math.abs(data[index]));
      sumSquares += data[index] * data[index];
    }
    samples += data.length;
  }
  return { buffer, analysis: { peak, peakDbfs: 20 * Math.log10(Math.max(peak, 1e-9)), rms: Math.sqrt(sumSquares / samples) } };
}

export class ProceduralGameplayMusic {
  constructor(context) {
    this.context = context;
    this.bufferPromise = null;
    this.source = null;
    this.gain = null;
    this.analysis = null;
    this.generation = 0;
  }

  prepare() {
    if (!this.bufferPromise) {
      this.bufferPromise = renderGameplayMusic().then((result) => {
        this.analysis = result.analysis;
        return result.buffer;
      });
    }
    return this.bufferPromise;
  }

  async start(volume) {
    const generation = ++this.generation;
    const buffer = await this.prepare();
    if (generation !== this.generation) return false;
    this.stop(0);
    this.generation = generation;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), this.context.currentTime + 0.24);
    source.connect(gain).connect(this.context.destination);
    source.start();
    this.source = source;
    this.gain = gain;
    return true;
  }

  setVolume(volume) {
    if (!this.gain) return;
    this.gain.gain.cancelScheduledValues(this.context.currentTime);
    this.gain.gain.setTargetAtTime(Math.max(0.0001, volume), this.context.currentTime, 0.04);
  }

  stop(fadeSeconds = 0.16) {
    this.generation += 1;
    const source = this.source;
    const gain = this.gain;
    this.source = null;
    this.gain = null;
    if (!source || !gain) return;
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
    source.stop(now + fadeSeconds + 0.02);
  }
}
