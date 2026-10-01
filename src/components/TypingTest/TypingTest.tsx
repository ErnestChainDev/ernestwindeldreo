import { memo, useEffect, useLayoutEffect, useReducer, useRef, useState, type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, ChevronDown, RotateCw } from "lucide-react";
import { navigateTo } from "../../lib/navigation";
import { createSession, getStats, testReducer, type TestLanguage, type TestMode, type TestSettings } from "./typing-model";
import "./TypingTest.css";

const limits = { time: [15, 30, 60, 120], words: [10, 25, 50, 100] };

function followCaret(viewport: HTMLDivElement) {
    const caret = viewport.querySelector<HTMLElement>(".is-current");
    if (!caret) return;
    const top = caret.offsetTop;
    const lineHeight = parseFloat(getComputedStyle(viewport).lineHeight);
    if (top < viewport.scrollTop || top + lineHeight > viewport.scrollTop + viewport.clientHeight) {
        viewport.scrollTop = Math.max(0, top - lineHeight);
    }
}

function goBack() {
    if (window.history.state?.portfolioReturnTo && window.history.length > 1) window.history.back();
    else navigateTo("/");
}

const Passage = memo(function Passage({ text, typed }: { text: string; typed: string }) {
    return <div className="typing-test-passage" aria-hidden="true">
        {Array.from(text.matchAll(/\S+\s?/g)).map(match => {
            const start = match.index;
            return <span className="typing-test-word" key={start}>
                {[...match[0]].map((character, index) => {
                    const position = start + index;
                    const status = position < typed.length ? typed[position] === character ? "correct" : "incorrect" : "pending";
                    return <span key={position} className={`typing-test-character is-${status}${position === typed.length ? " is-current" : ""}`}>{character}</span>;
                })}
            </span>;
        })}
    </div>;
});

export default function TypingTest() {
    const [session, dispatch] = useReducer(testReducer, undefined, () => createSession());
    const [focused, setFocused] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const { settings, startedAt, finishedAt, text, typed } = session;
    const running = startedAt !== null && finishedAt === null;
    const finished = finishedAt !== null;
    const stats = getStats(session);

    useEffect(() => {
        const main = mainRef.current;
        const visibleViewport = window.visualViewport;
        if (!main) return;
        let frame = 0;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                if (!window.matchMedia("(max-width: 600px)").matches || (visibleViewport && visibleViewport.scale !== 1)) {
                    main.style.removeProperty("--typing-visible-height");
                    main.style.removeProperty("--typing-visible-top");
                    return;
                }
                // The native keyboard shrinks the visual viewport, including on iOS.
                main.style.setProperty("--typing-visible-height", `${visibleViewport?.height ?? window.innerHeight}px`);
                main.style.setProperty("--typing-visible-top", `${visibleViewport?.offsetTop ?? 0}px`);
            });
        };
        update();
        visibleViewport?.addEventListener("resize", update);
        visibleViewport?.addEventListener("scroll", update);
        window.addEventListener("resize", update);
        return () => {
            cancelAnimationFrame(frame);
            visibleViewport?.removeEventListener("resize", update);
            visibleViewport?.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const observer = new ResizeObserver(() => followCaret(viewport));
        observer.observe(viewport);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
        });
        const escape = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
            event.preventDefault();
            goBack();
        };
        window.addEventListener("keydown", escape);
        return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", escape); };
    }, []);

    useEffect(() => {
        if (!running) return;
        const tick = () => dispatch({ type: "tick", now: Date.now() });
        const timer = window.setInterval(tick, 100);
        document.addEventListener("visibilitychange", tick);
        return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
    }, [running]);

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        if (!typed.length) { viewport.scrollTop = 0; return; }
        followCaret(viewport);
    }, [typed]);

    function reset(nextSettings: TestSettings = settings, forceFocus = true) {
        if (forceFocus) {
            // Keep native keyboard focus inside the restart button's user gesture.
            flushSync(() => dispatch({ type: "reset", settings: nextSettings }));
            inputRef.current?.focus({ preventScroll: true });
            return;
        }
        dispatch({ type: "reset", settings: nextSettings });
        if (window.matchMedia("(pointer: fine)").matches) {
            requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        }
    }

    function changeMode(mode: TestMode) {
        if (mode !== settings.mode) reset({ ...settings, mode, limit: mode === "time" ? 30 : 25 }, false);
    }

    function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
        dispatch({ type: "input", value: event.target.value, now: Date.now() });
    }

    return <main ref={mainRef} className={`typing-test${running ? " is-running" : ""}${finished ? " is-finished" : ""}`} aria-labelledby="typing-test-heading">
        <div className="typing-test-topbar">
            <p className="typing-test-brand"><span>Ernest Windel Dreo</span><span aria-hidden="true">/</span><span>Typing test</span></p>
            <button className="typing-test-back" type="button" onClick={goBack} aria-label="Go back to portfolio" aria-keyshortcuts="Escape">
                <ArrowLeft aria-hidden="true" /><span>Back</span>
            </button>
        </div>
        <header className="typing-test-hero">
            <h1 id="typing-test-heading">Typing test.</h1>
            <p>Find your rhythm. Test your speed.</p>
        </header>
        <section className="typing-test-stage" aria-label="Typing practice">
            <div className="typing-test-controls">
                <div className="typing-test-modes" role="group" aria-label="Test mode">
                    {(["time", "words"] as const).map(mode => <button key={mode} type="button" aria-pressed={settings.mode === mode} onClick={() => changeMode(mode)}>{mode}</button>)}
                </div>
                <span className="typing-test-divider" aria-hidden="true" />
                <div className="typing-test-limits" role="group" aria-label={settings.mode === "time" ? "Test duration in seconds" : "Number of words"}>
                    {limits[settings.mode].map(limit => <button key={limit} type="button" aria-pressed={settings.limit === limit} aria-label={`${limit} ${settings.mode === "time" ? "seconds" : "words"}`} onClick={() => reset({ ...settings, limit }, false)}>{limit}</button>)}
                </div>
                <label className="typing-test-language">
                    <span className="typing-test-sr-only">Passage language</span>
                    <select aria-label="Passage language" value={settings.language} onChange={event => reset({ ...settings, language: event.target.value as TestLanguage }, false)}>
                        <option value="english">English</option><option value="filipino">Filipino</option>
                    </select>
                    <ChevronDown aria-hidden="true" />
                </label>
            </div>
            <dl className="typing-test-stats" aria-label="Live typing statistics">
                <div><dd data-stat="progress">{settings.mode === "time" ? `${stats.remaining}s` : `${stats.words}/${settings.limit}`}</dd><dt>{settings.mode === "time" ? "remaining" : "words"}</dt></div>
                <div><dd data-stat="wpm">{stats.wpm}</dd><dt>WPM</dt></div>
                <div><dd data-stat="accuracy">{stats.accuracy}%</dd><dt>accuracy</dt></div>
            </dl>
            <div className={`typing-test-board${focused ? " is-focused" : ""}`}>
                <div className="typing-test-viewport" ref={viewportRef}><Passage text={text} typed={typed} /></div>
                <label className="typing-test-sr-only" htmlFor="typing-test-input">Type the passage</label>
                <p className="typing-test-sr-only" id="typing-test-instructions">Type the passage shown. The test starts with your first character. Use Backspace to correct a mistake. Tab then Enter restarts the test.</p>
                <p className="typing-test-sr-only" id="typing-test-target">{text}</p>
                <textarea id="typing-test-input" ref={inputRef} value={typed} onChange={handleInput} readOnly={finished}
                    aria-describedby="typing-test-instructions typing-test-target" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    onPaste={event => event.preventDefault()} onDrop={event => event.preventDefault()}
                    onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }}
                    onSelect={event => { const input = event.currentTarget; if (input.selectionStart !== input.value.length || input.selectionEnd !== input.value.length) input.setSelectionRange(input.value.length, input.value.length); }}
                />
            </div>
            <p className="typing-test-status" role="status" aria-live="polite">
                {finished ? `Test complete. ${stats.wpm} WPM with ${stats.accuracy}% accuracy.` : startedAt === null ? "Click or tap the text and start typing." : !focused ? "Click or tap the text to continue." : "\u00a0"}
            </p>
            <button className="typing-test-restart" type="button" onClick={() => reset()}><RotateCw aria-hidden="true" /><span>Restart test</span></button>
        </section>
        <footer className="typing-test-footer">
            <p>A little practice goes a long way.</p>
            <div className="typing-test-shortcuts" aria-hidden="true"><span><kbd>Tab</kbd><span>+</span><kbd>Enter</kbd><span>restart test</span></span><i /><span><kbd>Esc</kbd><span>back to portfolio</span></span></div>
        </footer>
    </main>;
}
