import { useCallback, useEffect, useReducer, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { navigateTo } from "../../../lib/navigation";
import { createSnake, GRID_SIZE, moveInterval, snakeReducer, type Direction, type SnakeAction, type SnakeGame } from "./snake-model";
import { SnakeAudio } from "./snake-audio";
import "./Snake.css";

const SOUND_KEY = "ewd:snake-sound";
const BEST_KEY = "ewd:snake-best";
function readPreference(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function savePreference(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ } }
function readBest() { const value = Number(readPreference(BEST_KEY)); return Number.isSafeInteger(value) && value > 0 ? value : 0; }
function goBack() { navigateTo("/playground"); }
function reduceSession(state: { game: SnakeGame; best: number }, action: SnakeAction) {
    const game = snakeReducer(state.game, action);
    return game === state.game ? state : { game, best: Math.max(state.best, game.score) };
}
const directionKeys: Record<string, Direction> = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
const controls = [{ direction: "up", Icon: ArrowUp }, { direction: "left", Icon: ArrowLeft }, { direction: "down", Icon: ArrowDown }, { direction: "right", Icon: ArrowRight }] as const;
const rotations = { right: 0, down: 90, left: 180, up: 270 };

export default function Snake() {
    const [{ game, best }, dispatch] = useReducer(reduceSession, undefined, () => ({ game: createSnake(), best: readBest() }));
    const boardRef = useRef<HTMLDivElement>(null);
    const phaseRef = useRef(game.phase);
    const swipeRef = useRef<{ x: number; y: number; id: number } | null>(null);
    const audioRef = useRef<SnakeAudio | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(() => readPreference(SOUND_KEY) !== "off");
    const soundEnabledRef = useRef(soundEnabled);
    const [soundAvailable, setSoundAvailable] = useState(true);
    const running = game.phase === "running";
    const paused = game.phase === "paused";
    const over = game.phase === "over" || game.phase === "won";

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
        } else if (startCue && phaseRef.current === "running") audio.play("start");
    }, []);
    const focusBoard = useCallback(() => requestAnimationFrame(() => boardRef.current?.focus({ preventScroll: true })), []);
    const start = useCallback(() => {
        dispatch({ type: "start" });
        void unlockSound(true);
        focusBoard();
    }, [focusBoard, unlockSound]);
    const pause = useCallback(() => { dispatch({ type: "pause" }); audioRef.current?.silence(); }, []);
    const resume = useCallback(() => {
        dispatch({ type: "resume" });
        void unlockSound();
        focusBoard();
    }, [focusBoard, unlockSound]);

    useEffect(() => { phaseRef.current = game.phase; }, [game.phase]);
    useEffect(() => { savePreference(BEST_KEY, String(best)); }, [best]);
    useEffect(() => {
        const audio = new SnakeAudio();
        audio.setEnabled(soundEnabledRef.current);
        audioRef.current = audio;
        return () => { audio.dispose(); audioRef.current = null; };
    }, []);
    useEffect(() => {
        if (!running) return;
        const timer = window.setTimeout(() => dispatch({ type: "tick" }), moveInterval(game.score));
        return () => clearTimeout(timer);
    }, [running, game.steps, game.score]);
    useEffect(() => { if (game.event) audioRef.current?.play(game.event); }, [game.event, game.steps]);
    useEffect(() => {
        function keyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
            if (event.key === "Escape") { event.preventDefault(); goBack(); return; }
            if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
            const direction = directionKeys[event.code];
            if (direction) {
                event.preventDefault();
                if (!event.repeat) dispatch({ type: "turn", direction });
            } else if (event.code === "KeyP") {
                event.preventDefault();
                if (!event.repeat) { if (running) pause(); else if (paused) resume(); }
            } else if (event.code === "Enter" || event.code === "Space") {
                if (event.repeat || (event.target instanceof Element && event.target.closest("button, a"))) return;
                event.preventDefault();
                if (paused) resume(); else if (!running) start();
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
    }, [pause, paused, resume, running, start]);

    function pointerDown(event: PointerEvent<HTMLDivElement>) {
        if (!running || !event.isPrimary || event.button !== 0) return;
        swipeRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
    }
    function pointerUp(event: PointerEvent<HTMLDivElement>) {
        const origin = swipeRef.current;
        if (!origin || event.pointerId !== origin.id) return;
        swipeRef.current = null;
        const x = event.clientX - origin.x, y = event.clientY - origin.y;
        if (Math.max(Math.abs(x), Math.abs(y)) < 12) return;
        dispatch({ type: "turn", direction: Math.abs(x) > Math.abs(y) ? x > 0 ? "right" : "left" : y > 0 ? "down" : "up" });
    }
    function toggleSound() {
        const enabled = !soundEnabledRef.current;
        soundEnabledRef.current = enabled;
        setSoundEnabled(enabled);
        savePreference(SOUND_KEY, enabled ? "on" : "off");
        audioRef.current?.setEnabled(enabled);
        if (enabled) void unlockSound();
    }
    const head = game.body[0];
    const status = over ? `${game.phase === "won" ? "Board complete" : "Game over"}. Score ${game.score}. Best ${best}.` : paused ? "Game paused." : running ? `Score ${game.score}.` : "Press Enter or select Start playing.";

    return <main className="snake" aria-labelledby="snake-heading">
        <nav className="snake-topbar" aria-label="Game navigation">
            <a href="/playground" className="snake-back"><ArrowLeft aria-hidden="true" />Back to Playground</a>
            <span className="snake-escape"><kbd>Esc</kbd> to go back</span>
        </nav>
        <header className="snake-header">
            <div><h1 id="snake-heading">Snake.</h1><p>A classic. One more bite.</p></div>
            <button type="button" className="snake-pause" onClick={running ? pause : paused ? resume : start} aria-keyshortcuts="P" aria-label={running ? "Pause game" : paused ? "Resume game" : over ? "Play again" : "Start game"}>
                {running ? <Pause fill="currentColor" aria-hidden="true" /> : over ? <RotateCcw aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}<span>{running ? "Pause" : paused ? "Resume" : over ? "Retry" : "Start"}</span>
            </button>
        </header>
        <section className="snake-board" aria-label="Snake game">
            <dl className="snake-hud">
                <div><dt>Score</dt><dd data-testid="snake-score">{String(game.score).padStart(4, "0")}</dd></div>
                <div><dt>Best</dt><dd data-testid="snake-best">{String(best).padStart(4, "0")}</dd></div>
            </dl>
            <div className="snake-grid-space">
                <div ref={boardRef} className="snake-grid" tabIndex={0} role="region" aria-label="Snake play area" aria-describedby="snake-instructions" onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { swipeRef.current = null; }}>
                    <svg viewBox="0 0 360 360" aria-hidden="true">
                        <defs><linearGradient id="snake-body-shade" x2="1" y2="1"><stop stopColor="#1b1c1f" /><stop offset="1" stopColor="#08090b" /></linearGradient><linearGradient id="snake-food-shade" x2="1" y2="1"><stop stopColor="#b9bdc7" /><stop offset="1" stopColor="#9a9fac" /></linearGradient></defs>
                        <g stroke="#e1e3e9" strokeWidth="1">
                            {Array.from({ length: GRID_SIZE - 1 }, (_, index) => <path key={index} d={`M${(index + 1) * 20} 0v360M0 ${(index + 1) * 20}h360`} />)}
                        </g>
                        {game.food && <rect className="snake-food" x={game.food.x * 20 + 1} y={game.food.y * 20 + 1} width="18" height="18" fill="url(#snake-food-shade)" stroke="#252933" strokeWidth="1.3" />}
                        <g fill="url(#snake-body-shade)" stroke="#050609" strokeWidth=".5">
                            {game.body.map((cell, index) => <rect className={index === 0 ? "snake-head" : "snake-segment"} key={`${cell.x}-${cell.y}`} x={cell.x * 20 + 1} y={cell.y * 20 + 1} width="18" height="18" />)}
                        </g>
                        <g fill="#eff0f4" transform={`translate(${head.x * 20} ${head.y * 20}) rotate(${rotations[game.direction]} 10 10)`}>
                            <path d="M5 4h3v3H5zm7 0h3v3h-3zM5 12h3v3H5zm7 0h3v3h-3z" />
                        </g>
                    </svg>
                </div>
            </div>
            {!running && <div className="snake-overlay"><div className="snake-message">
                <p className="snake-eyebrow">{game.phase === "won" ? "Every square counts" : over ? "A good little run" : paused ? "Take a breather" : "A familiar favorite"}</p>
                <h2>{game.phase === "won" ? "You filled the board." : over ? "One more bite?" : paused ? "A little pause." : "Ready to grow?"}</h2>
                <p>{over ? `${game.score} points · Best ${best}` : paused ? "Pick up right where you left off." : "Find a bite. Mind the edges."}</p>
                <button type="button" className="snake-start" onClick={paused ? resume : start}>{over ? <RotateCcw aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}{over ? "Play again" : paused ? "Resume game" : "Start playing"}</button>
                {!paused && !over && <p className="snake-start-hint"><span className="snake-desktop">Press Enter to start</span><span className="snake-touch">Swipe or use the arrows to move</span></p>}
            </div></div>}
        </section>
        <footer className="snake-footer">
            <div className="snake-controls">
                <div className="snake-control-group"><div className="snake-keys snake-direction-pad" aria-label="Direction controls">
                    {controls.map(({ direction, Icon }) => <button type="button" key={direction} className={`snake-key snake-key--${direction}`} disabled={!running} aria-label={`Move ${direction}`} onClick={() => dispatch({ type: "turn", direction })}><Icon aria-hidden="true" /></button>)}
                </div><span>Move</span></div>
                <div className="snake-control-group snake-wasd"><div className="snake-keys" aria-hidden="true"><kbd className="snake-key--up">W</kbd><kbd className="snake-key--left">A</kbd><kbd className="snake-key--down">S</kbd><kbd className="snake-key--right">D</kbd></div><span>Move</span></div>
                <div className="snake-control-group snake-pause-hint"><kbd>P</kbd><span>Pause</span></div>
                <span className="snake-touch snake-swipe-hint">Or swipe on the grid</span>
            </div>
            <p className="snake-tagline">Keep moving. Keep growing.</p>
            <button type="button" className="snake-sound" role="switch" aria-label="Game sound" aria-checked={soundEnabled} onClick={toggleSound}>{soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}<span>{soundAvailable ? "Sound" : "Sound unavailable"}</span><span className="snake-switch" aria-hidden="true" /></button>
        </footer>
        <p className="snake-sr-only" id="snake-instructions">Use arrow keys or W, A, S, D to move. On touch screens, swipe on the grid or use the arrow buttons. Eat the gray squares. Avoid the walls and your own tail. P pauses. Escape returns to Playground.</p>
        <p className="snake-sr-only" role="status">{status}</p>
    </main>;
}
