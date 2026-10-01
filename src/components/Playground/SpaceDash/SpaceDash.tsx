import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { navigateTo } from "../../../lib/navigation";
import { createFlight, emptyInput, flightScore, resizeFlight, startFlight, stepFlight, WORLD_HEIGHT, type Flight, type FlightPhase } from "./space-dash-model";
import { drawFlight } from "./space-dash-renderer";
import { SpaceDashAudio } from "./space-dash-audio";
import "./SpaceDash.css";

const SOUND_KEY = "ewd:space-dash-sound";
const BEST_KEY = "ewd:space-dash-best";

function readPreference(key: string) {
    try { return localStorage.getItem(key); } catch { return null; }
}

function savePreference(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* Play also works without storage. */ }
}

function readBest() {
    const value = Number(readPreference(BEST_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function goBack() { navigateTo("/playground"); }

export default function SpaceDash() {
    const boardRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const flightRef = useRef<Flight | null>(null);
    const inputRef = useRef(emptyInput());
    const audioRef = useRef<SpaceDashAudio | null>(null);
    const dragRef = useRef<number | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(() => readPreference(SOUND_KEY) !== "off");
    const soundEnabledRef = useRef(soundEnabled);
    const [soundAvailable, setSoundAvailable] = useState(true);
    const [best, setBest] = useState(readBest);
    const bestRef = useRef(best);
    const [hud, setHud] = useState({ phase: "ready" as FlightPhase, score: 0, distance: 0, fuel: 100, boosting: false });

    const publish = useCallback((flight: Flight) => {
        setHud({ phase: flight.phase, score: flightScore(flight), distance: Math.floor(flight.distance), fuel: Math.round(flight.fuel), boosting: flight.boosting });
    }, []);

    const unlockSound = useCallback(async (startCue = false) => {
        const audio = audioRef.current;
        if (!audio || !soundEnabledRef.current) return;
        const available = await audio.unlock();
        if (audioRef.current !== audio) return;
        setSoundAvailable(available);
        if (!available) {
            soundEnabledRef.current = false;
            setSoundEnabled(false);
            audio.setEnabled(false);
        } else if (startCue && flightRef.current?.phase === "running") audio.cue("start");
    }, []);

    const start = useCallback(() => {
        const flight = startFlight(flightRef.current?.width ?? 1600);
        flightRef.current = flight;
        inputRef.current = emptyInput();
        audioRef.current?.setFlying(true);
        publish(flight);
        void unlockSound(true);
        boardRef.current?.focus({ preventScroll: true });
    }, [publish, unlockSound]);

    const pause = useCallback(() => {
        inputRef.current = emptyInput();
        dragRef.current = null;
        const flight = flightRef.current;
        if (!flight || flight.phase !== "running") return;
        flight.phase = "paused";
        flight.boosting = false;
        audioRef.current?.setFlying(false);
        publish(flight);
    }, [publish]);

    const resume = useCallback(() => {
        const flight = flightRef.current;
        if (!flight || flight.phase !== "paused") return;
        flight.phase = "running";
        inputRef.current = emptyInput();
        audioRef.current?.setFlying(true);
        publish(flight);
        void unlockSound();
        boardRef.current?.focus({ preventScroll: true });
    }, [publish, unlockSound]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        flightRef.current = createFlight();
        const audio = new SpaceDashAudio();
        audio.setEnabled(soundEnabledRef.current);
        audioRef.current = audio;
        const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
        let width = 0, height = 0, ratio = 1, frame = 0, previous = 0, lastHud = 0;

        const paint = () => {
            if (flightRef.current && width && height) drawFlight(context, flightRef.current, width, height, ratio, motionPreference.matches);
        };
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            if (!width || !height || !flightRef.current) return;
            ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            resizeFlight(flightRef.current, width / height * WORLD_HEIGHT);
            paint();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();

        const tick = (time: number) => {
            const dt = previous ? (time - previous) / 1000 : 0;
            previous = time;
            const flight = flightRef.current;
            if (flight?.phase === "running") {
                const wasBoosting = flight.boosting;
                const milestone = Math.floor(flight.distance / 250);
                const phase = stepFlight(flight, inputRef.current, dt);
                if (phase === "over") {
                    audio.setFlying(false);
                    audio.cue("collision");
                    inputRef.current = emptyInput();
                    const highScore = Math.max(bestRef.current, flightScore(flight));
                    bestRef.current = highScore;
                    setBest(highScore);
                    savePreference(BEST_KEY, String(highScore));
                } else {
                    if (flight.boosting && !wasBoosting) audio.cue("boost");
                    if (Math.floor(flight.distance / 250) > milestone) audio.cue("milestone");
                }
                if (time - lastHud > 90 || phase !== "running" || wasBoosting !== flight.boosting) {
                    publish(flight);
                    lastHud = time;
                }
                paint();
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        motionPreference.addEventListener("change", paint);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            motionPreference.removeEventListener("change", paint);
            inputRef.current = emptyInput();
            audio.dispose();
            audioRef.current = null;
        };
    }, [publish]);

    useEffect(() => {
        function keyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
            if (event.key === "Escape") { event.preventDefault(); goBack(); return; }
            if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
            const phase = flightRef.current?.phase;
            if (event.code === "KeyP") {
                event.preventDefault();
                if (!event.repeat) { if (phase === "running") pause(); else if (phase === "paused") resume(); }
            } else if (event.code === "ArrowUp" || event.code === "ArrowDown") {
                event.preventDefault();
                if (phase === "running") {
                    inputRef.current[event.code === "ArrowUp" ? "up" : "down"] = true;
                    inputRef.current.targetY = null;
                }
            } else if (event.code === "Space" || event.code === "Enter") {
                // Focused controls keep their native keyboard activation.
                if (event.target instanceof Element && event.target.closest("button, a")) return;
                event.preventDefault();
                if (event.repeat && phase !== "running") return;
                if (phase === "ready" || phase === "over") start();
                else if (phase === "paused") resume();
                else if (event.code === "Space") inputRef.current.boost = true;
            }
        }
        function keyUp(event: KeyboardEvent) {
            if (event.code === "ArrowUp") inputRef.current.up = false;
            if (event.code === "ArrowDown") inputRef.current.down = false;
            if (event.code === "Space") inputRef.current.boost = false;
        }
        const visibility = () => { if (document.hidden) pause(); };
        window.addEventListener("keydown", keyDown);
        window.addEventListener("keyup", keyUp);
        window.addEventListener("blur", pause);
        document.addEventListener("visibilitychange", visibility);
        return () => {
            window.removeEventListener("keydown", keyDown);
            window.removeEventListener("keyup", keyUp);
            window.removeEventListener("blur", pause);
            document.removeEventListener("visibilitychange", visibility);
        };
    }, [pause, resume, start]);

    function toggleSound() {
        const enabled = !soundEnabledRef.current;
        soundEnabledRef.current = enabled;
        setSoundEnabled(enabled);
        savePreference(SOUND_KEY, enabled ? "on" : "off");
        audioRef.current?.setEnabled(enabled);
        if (enabled) void unlockSound();
    }

    function steer(event: PointerEvent<HTMLDivElement>) {
        if (dragRef.current !== event.pointerId) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        inputRef.current.targetY = (event.clientY - bounds.top) / bounds.height * WORLD_HEIGHT;
    }

    function hold(event: PointerEvent<HTMLButtonElement>, control: "up" | "down" | "boost") {
        if (flightRef.current?.phase !== "running") return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        inputRef.current[control] = true;
        inputRef.current.targetY = null;
    }

    function nudge(direction: number) {
        const flight = flightRef.current;
        if (flight?.phase === "running") flight.shipY = Math.max(92, Math.min(WORLD_HEIGHT - 38, flight.shipY + direction * 35));
    }

    const running = hud.phase === "running";
    const paused = hud.phase === "paused";
    const over = hud.phase === "over";

    return (
        <main className={`space-dash${hud.boosting ? " is-boosting" : ""}`} aria-labelledby="space-dash-heading">
            <nav className="space-dash-topbar" aria-label="Game navigation">
                <a href="/playground" className="space-dash-back"><ArrowLeft aria-hidden="true" />Back to Playground</a>
                <span className="space-dash-escape"><kbd>Esc</kbd> to go back</span>
            </nav>
            <header className="space-dash-header">
                <div><h1 id="space-dash-heading">Space Dash.</h1><p>Dodge the obstacles. Stay in orbit.</p></div>
                <button type="button" className="space-dash-pause" onClick={running ? pause : paused ? resume : start} aria-keyshortcuts="P" aria-label={running ? "Pause game" : paused ? "Resume game" : over ? "Play again" : "Start game"}>
                    {running ? <Pause fill="currentColor" aria-hidden="true" /> : over ? <RotateCcw aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
                    <span>{running ? "Pause" : paused ? "Resume" : over ? "Retry" : "Start"}</span>
                </button>
            </header>
            <div
                ref={boardRef} className="space-dash-board" role="region" tabIndex={0}
                aria-label="Space Dash flight area" aria-describedby="space-dash-instructions"
                onPointerDown={event => {
                    if (!running || (event.target instanceof Element && event.target.closest("button"))) return;
                    dragRef.current = event.pointerId;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    event.currentTarget.focus({ preventScroll: true });
                    steer(event);
                }}
                onPointerMove={steer}
                onPointerUp={() => { dragRef.current = null; inputRef.current.targetY = null; }}
                onPointerCancel={() => { dragRef.current = null; inputRef.current.targetY = null; }}
                onLostPointerCapture={() => { dragRef.current = null; inputRef.current.targetY = null; }}
            >
                <canvas ref={canvasRef} aria-hidden="true" />
                <dl className="space-dash-hud">
                    <div><dt>Score</dt><dd data-testid="flight-score">{String(hud.score).padStart(4, "0")}</dd></div>
                    <div><dt>Distance</dt><dd>{hud.distance} m</dd></div>
                </dl>
                {!running && <div className="space-dash-overlay">
                    <div className="space-dash-message">
                        <p className="space-dash-eyebrow">{over ? "Flight complete" : paused ? "Take a breath" : "A little escape"}</p>
                        <h2>{over ? "One more orbit?" : paused ? "Flight paused." : "Ready for takeoff?"}</h2>
                        <p>{over ? `${hud.score} points · ${hud.distance} m flown` : paused ? "Your orbit can wait." : "Find your gap. Keep flying."}</p>
                        {over && <p className="space-dash-best">Personal best: {best} points</p>}
                        <button type="button" className="space-dash-start" onClick={paused ? resume : start}>
                            {over ? <RotateCcw aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
                            {over ? "Play again" : paused ? "Resume flight" : "Start flight"}
                        </button>
                        {!over && !paused && <p className="space-dash-start-hint"><span className="space-dash-desktop-hint">Press Enter to start</span><span className="space-dash-touch-hint">Drag to steer. Hold Boost to dash.</span></p>}
                    </div>
                </div>}
            </div>
            <footer className="space-dash-footer">
                <div className="space-dash-controls" id="space-dash-instructions">
                    <div className="space-dash-control-group">
                        <button type="button" className="space-dash-key" aria-label="Move up" aria-keyshortcuts="ArrowUp" disabled={!running}
                            onPointerDown={event => hold(event, "up")} onPointerUp={() => { inputRef.current.up = false; }} onPointerCancel={() => { inputRef.current.up = false; }} onLostPointerCapture={() => { inputRef.current.up = false; }} onClick={event => { if (!event.detail) nudge(-1); }}><ArrowUp aria-hidden="true" /></button>
                        <button type="button" className="space-dash-key" aria-label="Move down" aria-keyshortcuts="ArrowDown" disabled={!running}
                            onPointerDown={event => hold(event, "down")} onPointerUp={() => { inputRef.current.down = false; }} onPointerCancel={() => { inputRef.current.down = false; }} onLostPointerCapture={() => { inputRef.current.down = false; }} onClick={event => { if (!event.detail) nudge(1); }}><ArrowDown aria-hidden="true" /></button>
                        <span>Move</span>
                    </div>
                    <div className="space-dash-control-group">
                        <button type="button" className="space-dash-key space-dash-boost" aria-label="Boost" aria-keyshortcuts="Space" aria-pressed={hud.boosting} disabled={!running}
                            onPointerDown={event => hold(event, "boost")} onPointerUp={() => { inputRef.current.boost = false; }} onPointerCancel={() => { inputRef.current.boost = false; }} onLostPointerCapture={() => { inputRef.current.boost = false; }} onClick={event => { if (!event.detail) inputRef.current.boost = !inputRef.current.boost; }}>
                            <span className="space-dash-desktop-hint">Space</span><span className="space-dash-touch-hint">Boost</span>
                        </button>
                        <span className="space-dash-boost-label">Boost<span className="space-dash-fuel" role="progressbar" aria-label="Boost energy" aria-valuenow={hud.fuel} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${hud.fuel}%` }} /></span></span>
                    </div>
                    <div className="space-dash-control-group space-dash-pause-hint"><kbd>P</kbd><span>Pause</span></div>
                </div>
                <p className="space-dash-tagline">Stay sharp. Keep flying.</p>
                <button type="button" className="space-dash-sound" role="switch" aria-checked={soundEnabled} aria-label="Game sound" onClick={toggleSound}>
                    {soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}<span>{soundAvailable ? "Sound" : "Sound unavailable"}</span><span className="space-dash-switch" aria-hidden="true" />
                </button>
            </footer>
            <p className="space-dash-sr-only" role="status">{over ? `Flight complete. ${hud.score} points. ${hud.distance} meters. Select Play again to restart.` : paused ? "Game paused. Press P to resume." : running ? "Flight started. Use up and down arrows to move and hold Space to boost. Press P to pause." : "Ready. Press Enter or select Start flight to play. On a touch screen, drag in the flight area to steer."}</p>
        </main>
    );
}
