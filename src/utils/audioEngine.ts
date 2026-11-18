// Synthesized cheerful classroom background music, sound effects, and English word pronunciation

export type SfxType = 'pickup' | 'correct' | 'wrong' | 'plateComplete' | 'victory' | 'tick';

class ClassroomAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private stepIndex = 0;
  private musicEnabled = false;
  private sfxEnabled = true;
  private musicVolume = 0.28;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.musicVolume;
      this.bgmGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.45;
      this.sfxGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isMusicPlaying(): boolean {
    return this.musicEnabled;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  public startMusic(): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;

    if (this.musicEnabled && this.bgmTimer !== null) {
      return true;
    }

    this.musicEnabled = true;
    this.scheduleBgmTick();
    return true;
  }

  public stopMusic(): void {
    this.musicEnabled = false;
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public toggleMusic(): boolean {
    if (this.musicEnabled) {
      this.stopMusic();
      return false;
    }
    return this.startMusic();
  }

  private scheduleBgmTick(): void {
    if (!this.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.bgmGain) return;

    // Gentle sunny C-major / F-major / G-major marimba loop (16 steps, 118 BPM eighth notes)
    // Frequencies in Hz (0 = rest)
    const melodyPattern = [
      523.25, 0, 659.25, 783.99, 659.25, 0, 880.0, 783.99,
      698.46, 0, 880.0, 783.99, 659.25, 587.33, 523.25, 0,
      523.25, 587.33, 659.25, 783.99, 1046.5, 0, 880.0, 783.99,
      698.46, 659.25, 587.33, 0, 659.25, 587.33, 523.25, 0,
    ];

    const bassPattern = [
      261.63, 0, 0, 0, 196.0, 0, 0, 0,
      174.61, 0, 0, 0, 196.0, 0, 261.63, 0,
      261.63, 0, 0, 0, 220.0, 0, 0, 0,
      174.61, 0, 196.0, 0, 261.63, 0, 0, 0,
    ];

    const idx = this.stepIndex % melodyPattern.length;
    const melFreq = melodyPattern[idx];
    const bassFreq = bassPattern[idx];
    const now = ctx.currentTime;

    if (melFreq > 0) {
      this.playMarimbaNote(ctx, this.bgmGain, melFreq, now, 0.24, 0.22);
    }
    if (bassFreq > 0) {
      this.playMarimbaNote(ctx, this.bgmGain, bassFreq, now, 0.34, 0.14);
    }

    this.stepIndex = (this.stepIndex + 1) % melodyPattern.length;
    this.bgmTimer = window.setTimeout(() => this.scheduleBgmTick(), 245);
  }

  private playMarimbaNote(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Subtle warm harmonic overtone
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, startTime);
    overtoneGain.gain.setValueAtTime(peakGain * 0.12, startTime);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.45);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(dest);
    gain.connect(dest);

    osc.start(startTime);
    overtone.start(startTime);
    osc.stop(startTime + duration + 0.03);
    overtone.stop(startTime + duration + 0.03);
  }

  public playSfx(type: SfxType): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;

    if (type === 'pickup') {
      this.playTone(ctx, this.sfxGain, 520, 680, now, 0.09, 'sine', 0.25);
    } else if (type === 'correct') {
      this.playMarimbaNote(ctx, this.sfxGain, 523.25, now, 0.16, 0.45);
      this.playMarimbaNote(ctx, this.sfxGain, 659.25, now + 0.08, 0.18, 0.45);
      this.playMarimbaNote(ctx, this.sfxGain, 783.99, now + 0.16, 0.28, 0.5);
    } else if (type === 'wrong') {
      this.playTone(ctx, this.sfxGain, 300, 210, now, 0.22, 'triangle', 0.3);
    } else if (type === 'plateComplete') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        this.playMarimbaNote(ctx, this.sfxGain!, f, now + i * 0.075, 0.26, 0.48);
      });
    } else if (type === 'victory') {
      const notes = [523.25, 659.25, 783.99, 1046.5, 880.0, 1046.5];
      const offsets = [0, 0.09, 0.18, 0.28, 0.42, 0.54];
      notes.forEach((f, i) => {
        this.playMarimbaNote(ctx, this.sfxGain!, f, now + offsets[i], 0.32, 0.52);
      });
    } else if (type === 'tick') {
      this.playTone(ctx, this.sfxGain, 880, 880, now, 0.05, 'sine', 0.18);
    }
  }

  private playTone(
    ctx: AudioContext,
    dest: AudioNode,
    freqStart: number,
    freqEnd: number,
    startTime: number,
    duration: number,
    wave: OscillatorType,
    peakGain: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freqStart, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public speakWord(
    text: string,
    options?: { slow?: boolean; onStart?: () => void; onEnd?: () => void }
  ): void {
    if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') {
      options?.onStart?.();
      globalThis.setTimeout(() => options?.onEnd?.(), 500);
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = options?.slow ? 0.65 : 0.92;
    utterance.pitch = 1.08;

    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => v.lang.startsWith('en-US') && /Google|Samantha|Natural|Jenny|Aria/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (preferred) {
      utterance.voice = preferred;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      options?.onEnd?.();
    };

    utterance.onstart = () => options?.onStart?.();
    utterance.onend = finish;
    utterance.onerror = finish;

    // Duck background music briefly while word plays
    if (this.bgmGain && this.ctx && this.musicEnabled) {
      this.bgmGain.gain.setTargetAtTime(this.musicVolume * 0.35, this.ctx.currentTime, 0.05);
      window.setTimeout(() => {
        if (this.bgmGain && this.ctx && this.musicEnabled) {
          this.bgmGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.12);
        }
      }, options?.slow ? 1400 : 1000);
    }

    options?.onStart?.();
    synth.speak(utterance);

    // Safety fallback timer in case browser speechSynthesis doesn't fire onend
    window.setTimeout(finish, options?.slow ? 2200 : 1600);
  }
}

export const audioEngine = new ClassroomAudioEngine();
