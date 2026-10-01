import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, ArrowRight, Check, CornerDownLeft, Lightbulb, Pause, Play, RotateCcw, Shuffle, Volume2, VolumeX } from "lucide-react";
import { navigateTo } from "../../../lib/navigation";
import { createWordGame, ROUND_COUNT, shuffleLetters, wordReducer } from "./word-scramble-model";
import { WordScrambleAudio } from "./word-scramble-audio";
import "./WordScramble.css";

const SOUND_KEY = "ewd:word-scramble-sound";
function readSound() { try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; } }
function goBack() { navigateTo("/playground"); }

export default function WordScramble() {
    const [game, dispatch] = useReducer(wordReducer, undefined, () => createWordGame());
    const mainRef = useRef<HTMLElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const restartRef = useRef<HTMLButtonElement>(null);
    const audioRef = useRef<WordScrambleAudio | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(readSound);
    const soundEnabledRef = useRef(soundEnabled);
    const [soundAvailable, setSoundAvailable] = useState(true);
    const running = game.phase === "running";
    const paused = game.phase === "paused";
    const answered = game.phase === "answered";
    const finished = game.phase === "finished";
    const lastRound = game.index === ROUND_COUNT - 1;
    const seconds = Math.ceil(game.remainingMs / 1000);

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
        } else if (startCue && inputRef.current && !inputRef.current.disabled && !inputRef.current.readOnly) audio.play("start");
    }, []);

    const start = useCallback(() => {
        flushSync(() => {
            if (game.phase === "finished") dispatch({ type: "reset", game: createWordGame() });
            dispatch({ type: "start", now: Date.now() });
        });
        void unlockSound(true);
        inputRef.current?.focus({ preventScroll: true });
    }, [game.phase, unlockSound]);
    const pause = useCallback(() => { dispatch({ type: "pause", now: Date.now() }); audioRef.current?.silence(); }, []);
    const resume = useCallback(() => {
        flushSync(() => dispatch({ type: "resume", now: Date.now() }));
        void unlockSound();
        inputRef.current?.focus({ preventScroll: true });
    }, [unlockSound]);
    const advance = useCallback(() => {
        flushSync(() => dispatch({ type: "next", now: Date.now() }));
        if (lastRound) restartRef.current?.focus({ preventScroll: true });
        else inputRef.current?.focus({ preventScroll: true });
    }, [lastRound]);

    useEffect(() => {
        const audio = new WordScrambleAudio();
        audio.setEnabled(soundEnabledRef.current);
        audioRef.current = audio;
        return () => { audio.dispose(); audioRef.current = null; };
    }, []);
    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => dispatch({ type: "tick", now: Date.now() }), 100);
        return () => clearInterval(timer);
    }, [running, game.deadline]);
    useEffect(() => {
        if (game.result) audioRef.current?.play(game.result === "correct" ? "correct" : "timeout");
    }, [game.result, game.index]);
    useEffect(() => {
        if (game.feedback.startsWith("Not quite")) audioRef.current?.play("incorrect");
    }, [game.feedback]);

    useEffect(() => {
        const main = mainRef.current;
        const viewport = window.visualViewport;
        if (!main) return;
        const update = () => {
            const mobile = window.matchMedia("(max-width: 600px)").matches;
            const height = mobile && viewport?.scale === 1 ? viewport.height : window.innerHeight;
            main.dataset.compact = String(height < 520);
            main.style.setProperty("--word-visible-height", `${height}px`);
            main.style.setProperty("--word-visible-top", `${mobile && viewport?.scale === 1 ? viewport.offsetTop : 0}px`);
        };
        update();
        window.addEventListener("resize", update);
        viewport?.addEventListener("resize", update);
        viewport?.addEventListener("scroll", update);
        return () => {
            window.removeEventListener("resize", update);
            viewport?.removeEventListener("resize", update);
            viewport?.removeEventListener("scroll", update);
        };
    }, []);

    useEffect(() => {
        function keyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.isComposing) return;
            if (event.key === "Escape") { event.preventDefault(); goBack(); return; }
            const editing = event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']");
            if (event.code === "KeyP" && (event.altKey || !editing)) {
                event.preventDefault();
                if (!event.repeat) { if (running) pause(); else if (paused) resume(); }
                return;
            }
            if (event.altKey || editing || (event.target instanceof Element && event.target.closest("button, a"))) return;
            if (event.code === "Enter" && !event.repeat) {
                event.preventDefault();
                if (game.phase === "ready" || finished) start();
                else if (paused) resume();
                else if (answered) advance();
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
    }, [advance, answered, finished, game.phase, pause, paused, resume, running, start]);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (answered) advance();
        else if (running) {
            flushSync(() => dispatch({ type: "submit", now: Date.now() }));
            inputRef.current?.focus({ preventScroll: true });
        }
    }
    function shuffle() {
        dispatch({ type: "shuffle", letters: shuffleLetters(game.deck[game.index], game.letters), now: Date.now() });
        audioRef.current?.play("shuffle");
        inputRef.current?.focus({ preventScroll: true });
    }
    function toggleSound() {
        const enabled = !soundEnabledRef.current;
        soundEnabledRef.current = enabled;
        setSoundEnabled(enabled);
        try { localStorage.setItem(SOUND_KEY, enabled ? "on" : "off"); } catch { /* Storage is optional. */ }
        audioRef.current?.setEnabled(enabled);
        if (enabled) void unlockSound();
    }

    const nextLabel = lastRound ? "See results" : "Next word";
    const headerLabel = running ? "Pause" : paused ? "Resume" : answered ? "Next" : finished ? "Retry" : "Start";

    return <main ref={mainRef} className={`word-scramble${paused ? " is-paused" : ""}`} aria-labelledby="word-scramble-heading">
        <nav className="word-scramble-topbar" aria-label="Game navigation">
            <a className="word-scramble-back" href="/playground"><ArrowLeft aria-hidden="true" />Back to Playground</a>
            <span className="word-scramble-escape"><kbd>Esc</kbd> to go back</span>
        </nav>
        <header className="word-scramble-header">
            <div><h1 id="word-scramble-heading">Word Scramble.</h1><p>Unscramble the letters. Beat the clock.</p></div>
            <button type="button" className="word-scramble-pause" aria-label={`${headerLabel} game`} aria-keyshortcuts="Alt+P" onClick={running ? pause : paused ? resume : answered ? advance : start}>
                {running ? <Pause fill="currentColor" aria-hidden="true" /> : answered ? <ArrowRight aria-hidden="true" /> : finished ? <RotateCcw aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}<span>{headerLabel}</span>
            </button>
        </header>
        <section className="word-scramble-board" aria-label="Word game">
            <dl className="word-scramble-hud">
                <div><dt>Score</dt><dd data-testid="word-score">{String(game.score).padStart(4, "0")}</dd></div>
                <div><dt>Round</dt><dd data-testid="word-round">{String(game.index + 1).padStart(2, "0")} / {ROUND_COUNT}</dd></div>
                <div className={seconds <= 5 && running ? "is-urgent" : undefined}><dt>Time left</dt><dd data-testid="word-time">00:{String(seconds).padStart(2, "0")}</dd></div>
            </dl>
            <div className="word-scramble-puzzle" aria-hidden={game.phase === "ready" || paused || finished ? true : undefined}>
                <p className="word-scramble-prompt">Make a word from these letters</p>
                <div className="word-scramble-letters" aria-label={`Letters: ${game.letters.split("").join(", ")}`}>
                    {[...game.letters].map((letter, index) => <span className="word-scramble-tile" key={index} aria-hidden="true">{letter}</span>)}
                </div>
                <p className="word-scramble-category">Category: Everyday words</p>
                <form className="word-scramble-form" onSubmit={submit}>
                    <label htmlFor="word-scramble-answer">Your answer</label>
                    <div className="word-scramble-answer-row">
                        <input ref={inputRef} id="word-scramble-answer" name="answer" value={game.answer} onChange={event => dispatch({ type: "input", value: event.target.value })}
                            disabled={!running && !answered} readOnly={answered} maxLength={game.letters.length} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint={answered ? "next" : "go"} aria-describedby="word-scramble-feedback word-scramble-hint" aria-invalid={game.feedback.startsWith("Not quite") || undefined} />
                        <button type="submit" className="word-scramble-check" disabled={!running && !answered}>{answered ? nextLabel : "Check"}{answered ? <ArrowRight aria-hidden="true" /> : <CornerDownLeft aria-hidden="true" />}</button>
                    </div>
                    <div className="word-scramble-tools">
                        <button type="button" disabled={!running || game.hintVisible} aria-expanded={game.hintVisible} aria-controls="word-scramble-hint" onClick={() => { dispatch({ type: "hint", now: Date.now() }); inputRef.current?.focus({ preventScroll: true }); }}><Lightbulb aria-hidden="true" />{game.hintVisible ? "Hint shown" : "Show hint"}</button>
                        <button type="button" disabled={!running} onClick={shuffle}><Shuffle aria-hidden="true" />Shuffle letters</button>
                    </div>
                    <p id="word-scramble-hint" className="word-scramble-hint">{game.hintVisible ? game.deck[game.index].hint : ""}</p>
                    <p id="word-scramble-feedback" className={`word-scramble-feedback${game.result === "correct" ? " is-correct" : game.feedback ? " has-feedback" : ""}`} role="status">
                        {game.result === "correct" && <Check aria-hidden="true" />}{game.feedback || "Enter to check your answer"}
                    </p>
                </form>
            </div>
            {(game.phase === "ready" || paused || finished) && <div className="word-scramble-overlay"><div className="word-scramble-message">
                <p className="word-scramble-eyebrow">{finished ? "Nicely played" : paused ? "Take your time" : "A little word play"}</p>
                <h2>{finished ? "Words well spent." : paused ? "On a word break." : "Ready to unscramble?"}</h2>
                <p>{finished ? `${game.score} points · ${game.solved} of ${ROUND_COUNT} words solved` : paused ? "Your timer is paused." : "10 words. 30 seconds each. 20 points per word."}</p>
                <button ref={restartRef} type="button" className="word-scramble-start" onClick={paused ? resume : start}>{finished ? <RotateCcw aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}{finished ? "Play again" : paused ? "Resume game" : "Start playing"}</button>
            </div></div>}
        </section>
        <footer className="word-scramble-footer">
            <div className="word-scramble-controls"><span><kbd>Enter</kbd>{answered ? nextLabel : "Check answer"}</span><span><kbd>Alt + P</kbd>Pause</span></div>
            <p className="word-scramble-tagline">One word at a time.</p>
            <button type="button" className="word-scramble-sound" role="switch" aria-label="Game sound" aria-checked={soundEnabled} onClick={toggleSound}>{soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}<span>{soundAvailable ? "Sound" : "Sound unavailable"}</span><span className="word-scramble-switch" aria-hidden="true" /></button>
        </footer>
    </main>;
}
