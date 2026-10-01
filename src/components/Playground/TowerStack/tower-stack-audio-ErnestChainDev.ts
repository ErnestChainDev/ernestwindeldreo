type TowerCue = "start" | "drop" | "land" | "perfect" | "miss";

export class TowerStackAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private music: GainNode | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private enabled = true;
    private playing = false;
    private disposed = false;
    private note = 0;

    async unlock() {
        if (this.disposed) return false;
        try {
            if (!this.context) {
                this.context = new AudioContext();
                this.master = this.context.createGain();
                this.master.gain.value = this.enabled ? .15 : 0;
                this.master.connect(this.context.destination);
                this.music = this.context.createGain();
                this.music.gain.value = this.playing ? 1 : 0;
                this.music.connect(this.master);
            }
            if (this.context.state === "suspended") await this.context.resume();
            return !this.disposed && this.context.state === "running";
        } catch { return false; }
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (this.context && this.master) this.master.gain.setTargetAtTime(enabled ? .15 : 0, this.context.currentTime, .025);
    }

    setPlaying(playing: boolean) {
        this.playing = playing;
        if (this.context && this.music) this.music.gain.setTargetAtTime(playing ? 1 : 0, this.context.currentTime, .04);
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        if (!playing || this.disposed) return;
        // Sparse, rounded notes leave room for the placement sounds.
        const notes = [196, 0, 246.94, 0, 293.66, 0, 220, 0];
        this.timer = setInterval(() => {
            const frequency = notes[this.note++ % notes.length];
            if (frequency && this.music) this.tone(frequency, .65, .09, 0, "sine", frequency, this.music);
        }, 600);
    }

    cue(cue: TowerCue, streak = 0) {
        if (cue === "start") { this.tone(220, .3, .18); this.tone(329.63, .4, .13, .12); }
        else if (cue === "drop") this.tone(150, .1, .15, 0, "triangle", 100);
        else if (cue === "land") this.tone(174.61, .19, .22, 0, "sine", 130.81);
        else if (cue === "perfect") {
            const pitch = [329.63, 392, 440, 493.88, 587.33][Math.min(Math.max(streak - 1, 0), 4)];
            this.tone(pitch, .36, .19);
            this.tone(pitch * 1.5, .5, .09, .08);
        } else this.tone(196, .5, .2, 0, "triangle", 73.42);
    }

    private tone(frequency: number, duration: number, volume: number, delay = 0, wave: OscillatorType = "sine", endFrequency = frequency, destination = this.master) {
        if (!this.enabled || this.disposed || this.context?.state !== "running" || !destination) return;
        const start = this.context.currentTime + delay;
        const oscillator = this.context.createOscillator();
        const envelope = this.context.createGain();
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(volume, start + .015);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(envelope);
        envelope.connect(destination);
        oscillator.start(start);
        oscillator.stop(start + duration + .02);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    }

    dispose() {
        this.disposed = true;
        this.setPlaying(false);
        void this.context?.close().catch(() => {});
        this.context = null;
        this.master = null;
        this.music = null;
    }
}
