import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { musicTracks, type MusicTrack } from "./music-tracks";
import { usePlaygroundMusic } from "./use-playground-music";
import "./PlaygroundMusic.css";

function TrackArtwork({ track }: { track: MusicTrack }) {
    return <span className="playground-music-art" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none">
        {track.artwork === "stars" ? <>
            <g fill="currentColor">{[[8, 8], [34, 6], [40, 19], [7, 32], [31, 39], [22, 29], [17, 13], [39, 40]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" />)}</g>
            <path d="M17 21v8m-4-4h8M33 14v6m-3-3h6M12 39v4m-2-2h4" stroke="currentColor" strokeWidth="2" />
            <path d="m29 26 4 2-1 4-4 1-2-4z" fill="#898b95" stroke="currentColor" />
        </> : track.artwork === "waves" ? <g stroke="currentColor" strokeWidth="1.4">
            {[0, 5, 10].map(offset => <path key={offset} transform={`translate(0 ${offset})`} d="M4 17c7-9 13-9 21-2s13 8 19 0" />)}
        </g> : <>
            <path d="M26 5v8h6v6h5v16h-5v6H17v-4h-6V24h5v-8h5V9h5Z" fill="#171719" />
            <path d="M26 21v7h5v7H20v-4h-3v-6h4v-4z" fill="#f5f5f7" />
        </>}
    </svg></span>;
}
function formatTime(seconds: number) {
    const total = Math.max(0, Math.floor(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function rangeStyle(value: number): CSSProperties { return { "--music-progress": `${value}%` } as CSSProperties; }

export default function PlaygroundMusic() {
    const player = usePlaygroundMusic();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const track = musicTracks[player.index];
    const active = player.playing || player.loading;

    useEffect(() => {
        if (!open) return;
        const updateBounds = () => {
            const root = rootRef.current;
            if (root) root.style.setProperty("--music-popup-top", `${root.getBoundingClientRect().bottom + 8}px`);
        };
        updateBounds();
        const observer = new ResizeObserver(updateBounds);
        if (rootRef.current) observer.observe(rootRef.current);
        window.addEventListener("resize", updateBounds);
        const frame = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLButtonElement>('[data-selected="true"]')?.focus({ preventScroll: true }));
        const pointerDown = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
        };
        const keyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault(); event.stopPropagation();
            setOpen(false);
            triggerRef.current?.focus({ preventScroll: true });
        };
        document.addEventListener("pointerdown", pointerDown);
        document.addEventListener("keydown", keyDown);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("resize", updateBounds);
            document.removeEventListener("pointerdown", pointerDown);
            document.removeEventListener("keydown", keyDown);
        };
    }, [open]);

    if (!track) return null;
    const close = () => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); };
    return <div className="playground-music" ref={rootRef} onBlur={event => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
        <div className="playground-audio-actions">
            <button ref={triggerRef} type="button" className={`playground-audio-icon${open ? " is-open" : ""}`} aria-label="Choose music" title="Choose music" aria-haspopup="dialog" aria-expanded={open} aria-controls="playground-music-picker" onClick={() => setOpen(previous => !previous)}>
                <Music2 aria-hidden="true" />{player.playing && <span className="playground-music-dot" aria-hidden="true" />}
            </button>
            <button type="button" className="playground-audio-icon" aria-label={player.muted ? "Unmute music" : "Mute music"} title={player.muted ? "Unmute music" : "Mute music"} aria-pressed={player.muted} onClick={player.toggleMute}>{player.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button>
        </div>
        {open && <div ref={panelRef} id="playground-music-picker" className="playground-music-panel" role="dialog" aria-label="Music picker" aria-describedby="playground-music-description">
            <header className="playground-music-heading"><div><h2><Music2 aria-hidden="true" />Music</h2><p id="playground-music-description">Pick a soundtrack for your break.</p></div><button type="button" className="playground-music-close" aria-label="Close music picker" onClick={close}><X aria-hidden="true" /></button></header>
            <ul className="playground-music-tracks" aria-label="Available music">
                {musicTracks.map((item, index) => {
                    const selected = index === player.index;
                    const playing = selected && active;
                    return <li key={item.id}><button type="button" className="playground-music-track" data-selected={selected} aria-label={`${playing ? "Pause" : "Play"} ${item.title}`} onClick={() => selected ? player.togglePlay() : void player.playTrack(index)}>
                        <TrackArtwork track={item} /><span className="playground-music-track-copy"><strong>{item.title}</strong><small>{item.artist}</small></span>
                        {playing ? <span className={`playground-music-playing${player.loading ? " is-loading" : ""}`}><span className="playground-music-bars" aria-hidden="true"><i /><i /><i /></span><span>{player.loading ? "Loading" : "Playing"}</span></span> : <Play className="playground-music-track-play" fill="currentColor" aria-hidden="true" />}
                    </button></li>;
                })}
            </ul>
            <div className="playground-music-player">
                <div className="playground-music-now"><TrackArtwork track={track} /><div className="playground-music-now-copy"><strong>{track.title}</strong><span>{player.loading ? "Loading track…" : player.playing ? "Now playing" : "Ready when you are"}</span></div><div className="playground-music-transport">
                    <button type="button" aria-label="Previous track" onClick={player.previous}><SkipBack fill="currentColor" aria-hidden="true" /></button>
                    <button type="button" className="playground-music-toggle" aria-label={active ? "Pause music" : "Play music"} onClick={player.togglePlay}>{active ? <Pause fill="currentColor" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}</button>
                    <button type="button" aria-label="Next track" onClick={player.next}><SkipForward fill="currentColor" aria-hidden="true" /></button>
                </div></div>
                <div className="playground-music-timeline"><span>{formatTime(player.time)}</span><input type="range" aria-label="Music position" aria-valuetext={`${formatTime(player.time)} of ${formatTime(player.duration)}`} min="0" max={player.duration || 1} step="0.1" value={Math.min(player.time, player.duration || 1)} disabled={player.duration <= 0} onChange={event => player.seek(Number(event.target.value))} style={rangeStyle(player.duration ? player.time / player.duration * 100 : 0)} /><span>{player.duration ? formatTime(player.duration) : "–:––"}</span></div>
                <div className="playground-music-volume"><button type="button" aria-label={player.muted ? "Unmute player" : "Mute player"} onClick={player.toggleMute}>{player.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button><input type="range" aria-label="Music volume" aria-valuetext={`${Math.round((player.muted ? 0 : player.volume) * 100)} percent`} min="0" max="1" step="0.01" value={player.muted ? 0 : player.volume} onChange={event => player.setVolume(Number(event.target.value))} style={rangeStyle((player.muted ? 0 : player.volume) * 100)} /></div>
            </div>
            <p className="playground-music-error" role="status">{player.error}</p>
        </div>}
    </div>;
}
