import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Mouse, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { navigateTo } from "../../../lib/navigation";
import { createTower, dropBlock, resizeTower, startTower, stepTower, WORLD_HEIGHT, type TowerGame, type TowerPhase } from "./tower-stack-model";
import { drawTower } from "./tower-stack-renderer";
import { TowerStackAudio } from "./tower-stack-audio";
import "./TowerStack.css";

const SOUND_KEY = "ewd:tower-stack-sound";
const BEST_KEY = "ewd:tower-stack-best";
function readPreference(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function savePreference(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ } }
function readBest() { const value = Number(readPreference(BEST_KEY)); return Number.isSafeInteger(value) && value > 0 ? value : 0; }
function goBack() { navigateTo("/playground"); }

export default function TowerStack() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dropRef = useRef<HTMLButtonElement>(null);
    const gameRef = useRef<TowerGame | null>(null);
    const visibleWidthRef = useRef(1600);
    const audioRef = useRef<TowerStackAudio | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(() => readPreference(SOUND_KEY) !== "off");
    const soundEnabledRef = useRef(soundEnabled);
    const [soundAvailable, setSoundAvailable] = useState(true);
    const [best, setBest] = useState(readBest);
    const bestRef = useRef(best);
    const [hud, setHud] = useState({ phase: "ready" as TowerPhase, score: 0 });
    const [announcement, setAnnouncement] = useState("Press Enter or select Start stacking. Use Space, click, or tap the board to drop a block.");

    const publish = useCallback((game: TowerGame) => setHud({ phase: game.phase, score: game.score }), []);
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
        } else if (startCue && gameRef.current?.phase === "running") audio.cue("start");
    }, []);

    const start = useCallback(() => {
        const game = startTower(visibleWidthRef.current);
        gameRef.current = game;
        audioRef.current?.setPlaying(true);
        publish(game);
        setAnnouncement("Stack started. Press Space, click, or tap to drop. Press P to pause.");
        void unlockSound(true);
        requestAnimationFrame(() => dropRef.current?.focus({ preventScroll: true }));
    }, [publish, unlockSound]);

    const pause = useCallback(() => {
        const game = gameRef.current;
        if (!game || game.phase !== "running") return;
        game.phase = "paused";
        audioRef.current?.setPlaying(false);
        publish(game);
        setAnnouncement("Game paused. Press P to resume.");
    }, [publish]);

    const resume = useCallback(() => {
        const game = gameRef.current;
        if (!game || game.phase !== "paused") return;
        game.phase = "running";
        audioRef.current?.setPlaying(true);
        publish(game);
        setAnnouncement("Stack resumed.");
        void unlockSound();
        requestAnimationFrame(() => dropRef.current?.focus({ preventScroll: true }));
    }, [publish, unlockSound]);

    const drop = useCallback(() => {
        if (gameRef.current && dropBlock(gameRef.current)) audioRef.current?.cue("drop");
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        gameRef.current = createTower();
        const audio = new TowerStackAudio();
        audio.setEnabled(soundEnabledRef.current);
        audioRef.current = audio;
        const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
        let width = 0, height = 0, ratio = 1, frame = 0, previous = 0;
        const paint = () => { if (gameRef.current && width && height) drawTower(context, gameRef.current, width, height, ratio, motionPreference.matches); };
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width; height = rect.height;
            if (!width || !height || !gameRef.current) return;
            ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            visibleWidthRef.current = width / height * WORLD_HEIGHT;
            resizeTower(gameRef.current, visibleWidthRef.current);
            paint();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();
        const tick = (time: number) => {
            const dt = previous ? (time - previous) / 1000 : 0;
            previous = time;
            const game = gameRef.current;
            if (game && (game.phase === "running" || game.fragments.length > 0)) {
                const event = stepTower(game, dt);
                if (event) {
                    if (event === "miss") {
                        audio.setPlaying(false);
                        setAnnouncement(`Tower complete. ${game.score} blocks stacked. Select Play again to restart.`);
                    } else {
                        const highScore = Math.max(bestRef.current, game.score);
                        bestRef.current = highScore;
                        setBest(highScore);
                        savePreference(BEST_KEY, String(highScore));
                        setAnnouncement(`${event === "perfect" ? "Perfect placement." : "Block placed."} Score ${game.score}.`);
                    }
                    audio.cue(event, game.streak);
                    publish(game);
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
            audio.dispose();
            audioRef.current = null;
        };
    }, [publish]);

    useEffect(() => {
        function keyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
            if (event.key === "Escape") { event.preventDefault(); goBack(); return; }
            if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
            const phase = gameRef.current?.phase;
            if (event.code === "KeyP") {
                event.preventDefault();
                if (!event.repeat) { if (phase === "running") pause(); else if (phase === "paused") resume(); }
            } else if (event.code === "Space" || event.code === "Enter") {
                const control = event.target instanceof Element ? event.target.closest("button, a") : null;
                if (control && !control.matches(".tower-stack-drop-zone, .tower-stack-drop-key")) return;
                event.preventDefault();
                if (event.repeat) return;
                if (phase === "ready" || phase === "over") start();
                else if (phase === "paused") resume();
                else drop();
            }
        }
        const visibility = () => { if (document.hidden) pause(); };
        window.addEventListener("keydown", keyDown);
        window.addEventListener("blur", pause);
        document.addEventListener("visibilitychange", visibility);
        return () => {
            window.removeEventListener("keydown", keyDown);
            window.removeEventListener("blur", pause);
            document.removeEventListener("visibilitychange", visibility);
        };
    }, [drop, pause, resume, start]);

    function toggleSound() {
        const enabled = !soundEnabledRef.current;
        soundEnabledRef.current = enabled;
        setSoundEnabled(enabled);
        savePreference(SOUND_KEY, enabled ? "on" : "off");
        audioRef.current?.setEnabled(enabled);
        if (enabled) void unlockSound();
    }

    const running = hud.phase === "running";
    const paused = hud.phase === "paused";
    const over = hud.phase === "over";

    return <main className="tower-stack" aria-labelledby="tower-stack-heading">
        <nav className="tower-stack-topbar" aria-label="Game navigation">
            <a href="/playground" className="tower-stack-back"><ArrowLeft aria-hidden="true" />Back to Playground</a>
            <span className="tower-stack-escape"><kbd>Esc</kbd> to go back</span>
        </nav>
        <header className="tower-stack-header">
            <div><h1 id="tower-stack-heading">Tower Stack.</h1><p>Time your drop. Build a little higher.</p></div>
            <button type="button" className="tower-stack-pause" onClick={running ? pause : paused ? resume : start} aria-keyshortcuts="P" aria-label={running ? "Pause game" : paused ? "Resume game" : over ? "Play again" : "Start game"}>
                {running ? <Pause fill="currentColor" aria-hidden="true" /> : over ? <RotateCcw aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
                <span>{running ? "Pause" : paused ? "Resume" : over ? "Retry" : "Start"}</span>
            </button>
        </header>
        <div className="tower-stack-board" role="region" aria-label="Tower Stack play area">
            <canvas ref={canvasRef} aria-hidden="true" />
            <button ref={dropRef} type="button" className="tower-stack-drop-zone" aria-label="Drop moving block" aria-keyshortcuts="Space Enter" aria-describedby="tower-stack-instructions" disabled={!running} onClick={drop} />
            <dl className="tower-stack-hud">
                <div><dt>Score</dt><dd data-testid="tower-score">{String(hud.score).padStart(4, "0")}</dd></div>
                <div><dt>Best</dt><dd data-testid="tower-best">{String(best).padStart(4, "0")}</dd></div>
            </dl>
            {!running && <div className="tower-stack-overlay"><div className="tower-stack-message">
                <p className="tower-stack-eyebrow">{over ? "Tower complete" : paused ? "No rush" : "One block at a time"}</p>
                <h2>{over ? "A little higher?" : paused ? "Perfect little pause." : "Find your balance."}</h2>
                <p>{over ? `${hud.score} ${hud.score === 1 ? "block" : "blocks"} stacked · Best ${best}` : paused ? "Your tower will be right here." : "Line it up. Let it drop."}</p>
                <button type="button" className="tower-stack-start" onClick={paused ? resume : start}>
                    {over ? <RotateCcw aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}{over ? "Play again" : paused ? "Resume stacking" : "Start stacking"}
                </button>
                {!paused && !over && <p className="tower-stack-start-hint"><span className="tower-stack-desktop">Press Enter to start</span><span className="tower-stack-touch">Tap the board to drop a block.</span></p>}
            </div></div>}
        </div>
        <footer className="tower-stack-footer">
            <div className="tower-stack-controls" id="tower-stack-instructions">
                <div className="tower-stack-control-group"><button type="button" className="tower-stack-drop-key" aria-label="Drop block" aria-keyshortcuts="Space" disabled={!running} onClick={drop}><span className="tower-stack-desktop">Space</span><span className="tower-stack-touch">Drop</span></button><span>Drop block</span></div>
                <div className="tower-stack-control-group tower-stack-mouse"><Mouse aria-hidden="true" /><span>Click to drop</span></div>
                <div className="tower-stack-control-group tower-stack-pause-hint"><kbd>P</kbd><span>Pause</span></div>
                <span className="tower-stack-touch tower-stack-tap-hint">Or tap anywhere on the board</span>
            </div>
            <p className="tower-stack-tagline">Perfect timing. One block at a time.</p>
            <button type="button" className="tower-stack-sound" role="switch" aria-label="Game sound" aria-checked={soundEnabled} onClick={toggleSound}>
                {soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}<span>{soundAvailable ? "Sound" : "Sound unavailable"}</span><span className="tower-stack-switch" aria-hidden="true" />
            </button>
        </footer>
        <p className="tower-stack-sr-only" role="status">{announcement}</p>
    </main>;
}
