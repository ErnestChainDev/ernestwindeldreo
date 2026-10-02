import { useEffect, useRef, useState } from "react";
import { avatarDirection, type AvatarDirection } from "../lib/avatar-direction";
import front from "../assets/avatar-me/Refined monochrome developer portrait.png";
import up from "../assets/avatar-me/Monochrome Portrait Gazing Upward-1.png";
import left from "../assets/avatar-me/Monochrome Ernest avatar looking left-2.png";
import right from "../assets/avatar-me/Ernest looking right-3.png";
import down from "../assets/avatar-me/Monochrome suited avatar looking down.png";
import topLeft from "../assets/avatar-me/Ernest avatar gazing top-left-5.png";
import topRight from "../assets/avatar-me/Ernest’s top-right gaze-6.png";
import bottomLeft from "../assets/avatar-me/Ernest’s bottom-left gaze avatar-7.png";
import bottomRight from "../assets/avatar-me/Ernest’s bottom-right gaze-8.png";

const portraits: Record<AvatarDirection, string> = {
    front, up, left, right, down,
    "top-left": topLeft, "top-right": topRight,
    "bottom-left": bottomLeft, "bottom-right": bottomRight,
};

export default function OrbitalAvatar() {
    const rootRef = useRef<HTMLDivElement>(null);
    const [direction, setDirection] = useState<AvatarDirection>("front");

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        let frame = 0;
        let pointer: { x: number; y: number } | null = null;

        const update = () => {
            frame = 0;
            const bounds = root.getBoundingClientRect();
            if (!pointer || !bounds.width) {
                setDirection("front");
                return;
            }
            const dx = pointer.x - (bounds.left + bounds.width / 2);
            const dy = pointer.y - (bounds.top + bounds.height / 2);
            setDirection(avatarDirection(dx, dy, bounds.width * .16));
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
        const move = (event: PointerEvent) => {
            if (!event.isPrimary) return;
            pointer = { x: event.clientX, y: event.clientY };
            schedule();
        };
        const touch = (event: TouchEvent) => {
            const contact = event.touches[0];
            if (!contact) return;
            pointer = { x: contact.clientX, y: contact.clientY };
            schedule();
        };
        const tourPointer = (event: Event) => { pointer = (event as CustomEvent<{ x: number; y: number }>).detail; schedule(); };
        const reset = () => { pointer = null; schedule(); };
        // Keep a tap's gaze after the finger lifts, rather than immediately resetting.
        const leave = (event: PointerEvent) => { if (event.pointerType !== "touch" && !event.relatedTarget) reset(); };

        window.addEventListener("pointermove", move, { passive: true });
        window.addEventListener("touchstart", touch, { passive: true });
        // Touch events continue during native scrolling after pointer cancellation.
        window.addEventListener("touchmove", touch, { passive: true });
        window.addEventListener("portfolio:tour-pointer", tourPointer);
        window.addEventListener("pointerout", leave);
        window.addEventListener("blur", reset);
        window.addEventListener("resize", schedule);
        document.addEventListener("scroll", schedule, true);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("touchstart", touch);
            window.removeEventListener("touchmove", touch);
            window.removeEventListener("portfolio:tour-pointer", tourPointer);
            window.removeEventListener("pointerout", leave);
            window.removeEventListener("blur", reset);
            window.removeEventListener("resize", schedule);
            document.removeEventListener("scroll", schedule, true);
        };
    }, []);

    return (
        <div className="home-orbit" ref={rootRef} role="img" aria-label="Monochrome portrait of Ernest surrounded by orbital rings" data-gaze={direction}>
            <div className="home-orbit-art">
                <svg viewBox="0 0 320 320" fill="none" aria-hidden="true">
                    <circle cx="160" cy="160" r="142" stroke="#dedee6" />
                    <circle cx="160" cy="160" r="115" stroke="#c8c7d3" />
                    <g className="home-orbit-markers">
                        <circle cx="160" cy="18" r="5.5" fill="#a4a4b2" />
                    </g>
                    <g className="home-orbit-markers home-orbit-markers-inner">
                        <circle cx="79" cy="79" r="6" fill="#151516" />
                        <circle cx="275" cy="160" r="5.5" fill="#151516" />
                    </g>
                    <g className="home-orbit-markers home-orbit-markers-outer">
                        <circle cx="107" cy="292" r="5.5" fill="#a4a4b2" />
                    </g>
                </svg>
                <div className="home-orbit-portrait" aria-hidden="true">
                    {Object.entries(portraits).map(([gaze, src]) => (
                        <img key={gaze} src={src} alt="" draggable={false} decoding="async" className={gaze === direction ? "is-active" : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
