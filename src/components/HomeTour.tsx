import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Pause, Play, X } from "lucide-react";
import { usePathname } from "../lib/navigation";
import { portfolioTourSteps, tourStepDuration } from "../lib/portfolio-tour";
import "./HomeTour.css";

type Placement = {
    id: string; left: number; top: number; cursorX: number; cursorY: number;
    target: { left: number; top: number; width: number; height: number };
    portal: HTMLElement; fallback: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));
const menuEvent = (open: boolean) => window.dispatchEvent(new CustomEvent("portfolio:tour-menu", { detail: { open } }));

function subscribeMotion(callback: () => void) {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
}
const motionPreference = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function TypedMessage({ message, paused, ready, reducedMotion }: { message: string; paused: boolean; ready: boolean; reducedMotion: boolean }) {
    const [length, setLength] = useState(0);
    useEffect(() => {
        if (!ready || paused || reducedMotion) return;
        const interval = window.setInterval(() => {
            setLength(previous => {
                if (previous >= message.length) { clearInterval(interval); return previous; }
                return previous + 1;
            });
        }, 22);
        return () => window.clearInterval(interval);
    }, [message, paused, ready, reducedMotion]);

    return <p id="home-tour-description">
        <span className="home-tour-message-reserve" aria-hidden="true">{message}</span>
        <span className="home-tour-message-typed" aria-hidden="true">{reducedMotion ? message : message.slice(0, length)}{!reducedMotion && length < message.length && <span className="home-tour-text-caret" />}</span>
        <span className="home-tour-sr-only">{message}</span>
    </p>;
}

export default function HomeTour({ onClose }: { onClose: () => void }) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [visible, setVisible] = useState(() => !document.hidden);
    const [settledId, setSettledId] = useState("");
    const [placement, setPlacement] = useState<Placement | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const pauseRef = useRef<HTMLButtonElement>(null);
    const timerRef = useRef({ id: "", remaining: 0 });
    const pathname = usePathname();
    const reducedMotion = useSyncExternalStore(subscribeMotion, motionPreference);
    const step = portfolioTourSteps[index];
    const last = index === portfolioTourSteps.length - 1;
    const ready = placement?.id === step.id && pathname === "/";

    const settled = ready && settledId === step.id;

    const next = useCallback(() => {
        if (last) onClose();
        else setIndex(index + 1);
    }, [index, last, onClose]);

    useEffect(() => {
        document.documentElement.classList.add("portfolio-tour-active");
        const frame = requestAnimationFrame(() => pauseRef.current?.focus({ preventScroll: true }));
        const escape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onClose();
            }
        };
        const navigation = () => onClose();
        const back = () => onClose();
        const visibility = () => setVisible(!document.hidden);
        const interaction = (event: PointerEvent) => {
            if (!(event.target instanceof Element) || !event.target.closest(".home-tour-overlay")) setPaused(true);
        };
        window.addEventListener("keydown", escape, true);
        window.addEventListener("portfolio:navigate", navigation);
        window.addEventListener("popstate", back);
        document.addEventListener("visibilitychange", visibility);
        document.addEventListener("pointerdown", interaction, true);
        return () => {
            cancelAnimationFrame(frame);
            document.documentElement.classList.remove("portfolio-tour-active");
            window.removeEventListener("keydown", escape, true);
            window.removeEventListener("portfolio:navigate", navigation);
            window.removeEventListener("popstate", back);
            document.removeEventListener("visibilitychange", visibility);
            document.removeEventListener("pointerdown", interaction, true);
            menuEvent(false);
        };
    }, [onClose]);

    useEffect(() => {
        if (pathname !== "/") return;
        const configure = () => {
            menuEvent(window.innerWidth <= 900 && !!step.menu);
        };
        const frame = requestAnimationFrame(configure);
        window.addEventListener("resize", configure);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", configure);
        };
    }, [step, pathname]);

    useEffect(() => {
        if (!ready) return;
        const timeout = window.setTimeout(() => setSettledId(step.id), reducedMotion ? 0 : 720);
        return () => clearTimeout(timeout);
    }, [step.id, ready, reducedMotion]);

    useLayoutEffect(() => {
        if (pathname !== "/") return;
        let frame = 0;
        let scrolled = false;
        let observedTarget: HTMLElement | null = null;
        const started = performance.now();
        const observer = new ResizeObserver(() => schedule());
        const findVisible = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)].find(element => {
            const bounds = element.getBoundingClientRect();
            return bounds.width > 0 && bounds.height > 0;
        });
        const update = () => {
            frame = 0;
            const card = cardRef.current;
            if (!card) return;
            const target = findVisible(step.target);
            const fallback = !target && performance.now() - started >= 2500;
            const anchor = target ?? (fallback ? findVisible(".portfolio-content h1") : undefined);
            if (!anchor) { schedule(); return; }
            const dialog = document.querySelector<HTMLDialogElement>("#home-mobile-menu");
            const portal = dialog?.open ? dialog : document.body;
            if (window.innerWidth <= 900 && step.menu && portal === document.body) { schedule(); return; }
            if (anchor !== observedTarget) {
                if (observedTarget) observer.unobserve(observedTarget);
                observedTarget?.removeAttribute("data-tour-current");
                observedTarget = anchor;
                anchor.setAttribute("data-tour-current", "true");
                observer.observe(anchor);
                scrolled = false;
            }
            if (!scrolled) {
                anchor.scrollIntoView({ block: anchor.offsetHeight > window.innerHeight / 2 ? "start" : "center", inline: "nearest", behavior: "instant" });
                scrolled = true;
            }
            const rect = anchor.getBoundingClientRect();
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight;
            let left = Math.max(10, rect.left);
            let right = Math.min(viewportWidth - 10, rect.right);
            let top = Math.max(10, rect.top);
            let bottom = Math.min(viewportHeight - 68, rect.bottom);
            for (let parent = anchor.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
                const style = getComputedStyle(parent);
                const bounds = parent.getBoundingClientRect();
                if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
                if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
            }
            if (portal !== document.body) top = Math.max(top, portal.querySelector(".home-sidebar-heading")?.getBoundingClientRect().bottom ?? 10);
            const cursorX = clamp(rect.left + (step.id === "avatar" ? rect.width / 2 : step.menu ? Math.min(115, rect.width * .52) : Math.min(70, rect.width / 2)), left + 5, right - 5);
            const cursorY = clamp(step.id === "avatar" ? rect.bottom - 24 : rect.top + Math.min(rect.height / 2, 38), top + 5, bottom - 5);
            const width = card.offsetWidth;
            const height = card.offsetHeight;
            let cardLeft = cursorX + 12;
            let cardTop = cursorY + 12;
            if (cardLeft + width > viewportWidth - 16) cardLeft = cursorX - width - 18;
            if (cardTop + height > viewportHeight - 76) cardTop = cursorY - height - 18;
            if (viewportWidth <= 900 && rect.height < viewportHeight * .45 && cardLeft < rect.right && cardLeft + width > rect.left) {
                if (rect.bottom + height + 12 <= viewportHeight - 76) cardTop = rect.bottom + 12;
                else if (rect.top - height - 12 >= 12) cardTop = rect.top - height - 12;
            }
            const nextPlacement: Placement = {
                id: step.id, left: clamp(cardLeft, 16, viewportWidth - width - 16), top: clamp(cardTop, 12, viewportHeight - height - 76),
                cursorX, cursorY, portal, fallback,
                target: { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) },
            };
            setPlacement(previous => previous && previous.id === nextPlacement.id && previous.portal === portal &&
                previous.left === nextPlacement.left && previous.top === nextPlacement.top &&
                previous.cursorX === cursorX && previous.cursorY === cursorY &&
                JSON.stringify(previous.target) === JSON.stringify(nextPlacement.target) ? previous : nextPlacement);
            window.dispatchEvent(new CustomEvent("portfolio:tour-pointer", { detail: { x: cursorX, y: cursorY } }));
            if (portal !== document.body && !portal.contains(document.activeElement)) pauseRef.current?.focus({ preventScroll: true });
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
        if (cardRef.current) observer.observe(cardRef.current);
        const mutations = new MutationObserver(schedule);
        mutations.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("resize", schedule);
        document.addEventListener("scroll", schedule, true);
        schedule();
        return () => {
            cancelAnimationFrame(frame);
            observedTarget?.removeAttribute("data-tour-current");
            observer.disconnect();
            mutations.disconnect();
            window.removeEventListener("resize", schedule);
            document.removeEventListener("scroll", schedule, true);
        };
    }, [step, pathname]);

    useEffect(() => {
        const timer = timerRef.current;
        if (timer.id !== step.id) { timer.id = step.id; timer.remaining = tourStepDuration(step.message); }
        if (!ready || paused || !visible) return;
        const started = performance.now();
        const timeout = window.setTimeout(next, timer.remaining);
        return () => {
            clearTimeout(timeout);
            timer.remaining = Math.max(0, timer.remaining - (performance.now() - started));
        };
    }, [step, ready, paused, visible, next]);

    useEffect(() => {
        if (!ready) return;
        const frame = requestAnimationFrame(() => pauseRef.current?.focus({ preventScroll: true }));
        return () => cancelAnimationFrame(frame);
    }, [step.id, ready, placement?.portal]);

    const portal = placement?.portal.isConnected ? placement.portal : document.body;
    return createPortal(
        <div className="home-tour-overlay" data-step={step.id} data-index={index} data-total={portfolioTourSteps.length} data-ready={ready} data-fallback={placement?.fallback ?? false} data-paused={paused} data-settled={settled}>
            {ready && placement && <div className="home-tour-highlight" aria-hidden="true" style={placement.target} />}
            <svg className="home-tour-cursor" viewBox="0 0 28 32" aria-hidden="true" style={{ transform: "translate3d(" + (placement?.cursorX ?? 0) + "px, " + (placement?.cursorY ?? 0) + "px, 0)", opacity: ready ? 1 : 0 }}>
                <path d="M3 2.5 24 13.4 14.2 16.8 10.6 28Z" fill="#111112" stroke="#fff" strokeWidth="2.3" strokeLinejoin="round" />
            </svg>
            <div ref={cardRef} className={"home-tour-card" + (settled ? " is-settled" : "")} role="dialog" aria-label="Ernest’s portfolio tour" aria-describedby={settled ? "home-tour-description" : undefined} aria-live="polite" aria-atomic="true" style={{ left: placement?.left ?? 16, top: placement?.top ?? 16, opacity: ready ? 1 : 0 }}>
                <header><span>Ernest</span><span className="home-tour-sr-only">{String(index + 1).padStart(2, "0")} / {portfolioTourSteps.length}</span></header>
                {settled && <TypedMessage key={"message-" + step.id} message={step.message} paused={!visible} ready={settled} reducedMotion={reducedMotion} />}
            </div>
            <div className="home-tour-dock" role="group" aria-label="Tour controls" onKeyDown={event => {
                event.stopPropagation();
                if (event.key === "ArrowRight") { event.preventDefault(); next(); }
                if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); setIndex(index - 1); }
            }}>
                <button type="button" className="home-tour-back" disabled={index === 0} aria-label="Previous tour step" onClick={() => setIndex(Math.max(0, index - 1))}><ArrowLeft aria-hidden="true" /></button>
                <button ref={pauseRef} type="button" className="home-tour-pause" aria-label={paused ? "Resume automatic tour" : "Pause automatic tour"} onClick={() => setPaused(previous => !previous)}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}<span>{paused ? "Resume tour" : "Pause tour"}</span></button>
                <button type="button" className="home-tour-next" aria-label={last ? "Finish tour" : "Next tour step"} onClick={next}>{last ? <Check aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</button>
                <button type="button" className="home-tour-skip" aria-label="Skip tour" onClick={() => onClose()}><X aria-hidden="true" /></button>
            </div>
        </div>, portal,
    );
}
