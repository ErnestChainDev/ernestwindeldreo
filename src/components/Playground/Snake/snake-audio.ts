export class SnakeAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private enabled = true;
    private disposed = false;
    private voices = new Set<{ oscillator: OscillatorNode; envelope: GainNode }>();

    async unlock() {
        if (this.disposed) return false;
        try {
            if (!this.context) {
                this.context = new AudioContext();
                this.master = this.context.createGain();
                this.master.gain.value = this.enabled ? .14 : 0;
                this.master.connect(this.context.destination);
            }
            if (this.context.state === "suspended") await this.context.resume();
            return !this.disposed && this.context.state === "running";
        } catch { return false; }
    }
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (this.context && this.master) this.master.gain.setTargetAtTime(enabled ? .14 : 0, this.context.currentTime, .025);
    }
    play(cue: "start" | "eat" | "crash" | "win") {
        if (!this.enabled || this.context?.state !== "running" || !this.master) return;
        const notes = cue === "eat" ? [392, 523.25] : cue === "start" ? [261.63, 329.63] : cue === "win" ? [329.63, 392, 523.25] : [196, 146.83];
        notes.forEach((frequency, index) => {
            const context = this.context!;
            const oscillator = context.createOscillator();
            const envelope = context.createGain();
            const start = context.currentTime + index * .09;
            oscillator.type = "sine";
            oscillator.frequency.value = frequency;
            envelope.gain.setValueAtTime(0, start);
            envelope.gain.linearRampToValueAtTime(.18, start + .015);
            envelope.gain.exponentialRampToValueAtTime(.0001, start + .24);
            oscillator.connect(envelope); envelope.connect(this.master!);
            const voice = { oscillator, envelope };
            this.voices.add(voice);
            oscillator.start(start); oscillator.stop(start + .26);
            oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); this.voices.delete(voice); };
        });
    }
    silence() {
        if (!this.context) return;
        const now = this.context.currentTime;
        for (const { oscillator, envelope } of this.voices) {
            envelope.gain.cancelScheduledValues(now);
            envelope.gain.setTargetAtTime(0, now, .015);
            oscillator.stop(now + .06);
        }
    }
    dispose() {
        this.disposed = true;
        this.silence();
        void this.context?.close().catch(() => {});
        this.context = null; this.master = null;
    }
}
