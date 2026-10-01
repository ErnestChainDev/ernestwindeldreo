type SoundCue = "start" | "boost" | "milestone" | "collision";

// Quiet, rounded synth notes: no downloaded audio or abrupt square-wave beeps.
export class SpaceDashAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private music: GainNode | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private enabled = true;
    private flying = false;
    private note = 0;
    private disposed = false;

    async unlock() {
        if (this.disposed) return false;
        try {
            if (!this.context) {
                this.context = new AudioContext();
                this.master = this.context.createGain();
                this.master.gain.value = this.enabled ? .16 : 0;
                this.master.connect(this.context.destination);
                this.music = this.context.createGain();
                this.music.gain.value = this.flying ? 1 : 0;
                this.music.connect(this.master);
            }
            if (this.context.state === "suspended") await this.context.resume();
            return !this.disposed && this.context.state === "running";
        } catch { return false; }
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (this.context && this.master) this.master.gain.setTargetAtTime(enabled ? .16 : 0, this.context.currentTime, .025);
    }

    setFlying(flying: boolean) {
        this.flying = flying;
        if (this.context && this.music) this.music.gain.setTargetAtTime(flying ? 1 : 0, this.context.currentTime, .05);
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        if (!flying || this.disposed) return;
        const melody = [220, 0, 329.63, 0, 293.66, 0, 196, 0];
        this.timer = setInterval(() => {
            if (!this.enabled || !this.music || this.context?.state !== "running") return;
            const frequency = melody[this.note++ % melody.length];
            if (frequency) this.tone(frequency, .55, .12, 0, "sine", frequency, this.music);
        }, 430);
    }

    cue(cue: SoundCue) {
        if (!this.enabled || this.context?.state !== "running") return;
        if (cue === "start") {
            this.tone(261.63, .3, .22);
            this.tone(392, .4, .16, .12);
        } else if (cue === "boost") this.tone(130.81, .32, .19, 0, "triangle", 261.63);
        else if (cue === "milestone") {
            this.tone(523.25, .3, .14);
            this.tone(659.25, .4, .12, .14);
        } else this.tone(155.56, .55, .24, 0, "triangle", 65.41);
    }

    private tone(frequency: number, duration: number, volume: number, delay = 0, wave: OscillatorType = "sine", endFrequency = frequency, destination = this.master) {
        if (!this.context || !destination || this.disposed) return;
        const start = this.context.currentTime + delay;
        const oscillator = this.context.createOscillator();
        const envelope = this.context.createGain();
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(volume, start + .025);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(envelope);
        envelope.connect(destination);
        oscillator.start(start);
        oscillator.stop(start + duration + .02);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    }

    dispose() {
        this.disposed = true;
        this.setFlying(false);
        void this.context?.close().catch(() => {});
        this.context = null;
        this.master = null;
        this.music = null;
    }
}
