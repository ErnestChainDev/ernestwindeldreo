import { useRef, useState } from "react";
import { Keyboard, Play, X } from "lucide-react";
import { navigateTo } from "../../lib/navigation";
import "./Playground.css";
import PlaygroundMusic from "./PlaygroundMusic";

function PixelController({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 84 56" fill="none" aria-hidden="true">
            <path d="M18 6h48v4h6v6h6v28h-4v6H62v-6h-6v-6H28v6h-6v6H10v-6H6V16h6v-6h6Z" stroke="currentColor" strokeWidth="3" />
            <path d="M22 16v18M13 25h18" stroke="currentColor" strokeWidth="5" />
            <path d="M38 27h4m5 0h4" stroke="currentColor" strokeWidth="3" />
            <g fill="currentColor">
                <circle cx="65" cy="19" r="3" /><circle cx="58" cy="26" r="3" />
                <circle cx="72" cy="26" r="3" /><circle cx="65" cy="33" r="3" />
            </g>
        </svg>
    );
}

function Asteroid({ x, y, size }: { x: number; y: number; size: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${size / 48})`} stroke="#111" strokeWidth="2.5" strokeLinejoin="miter">
            <path d="M15 2h20v4h5v7h5v21h-5v7h-7v5H15v-4H8v-7H3V16h5V9h7Z" fill="#a3a3a3" />
            <path d="M15 3h17v5H14v7H9v14H5V16h4V9h6Z" fill="#d1d1d1" stroke="none" />
            <path d="M16 10h6v5h-6Zm15 11h6v7h-6ZM12 28h5v5h-5Zm13 10h6v5h-6Z" fill="#555" />
        </g>
    );
}

function SpacePreview() {
    return (
        <svg viewBox="0 0 600 220" fill="none" aria-hidden="true">
            <g stroke="#171719" strokeWidth="3">
                <path d="M29 24v11m-5-5h11M573 29v12m-6-6h12M437 71v12m-6-6h12M385 137v12m-6-6h12M379 15v9m-4-5h9M41 147v8m-4-4h8M391 176v8m-4-4h8" />
            </g>
            <g fill="#252528">
                {[[60, 50], [167, 42], [235, 50], [355, 35], [486, 42], [589, 68], [565, 152], [382, 87], [429, 135], [297, 139], [347, 184], [177, 174], [94, 154], [16, 184], [35, 94], [224, 172]].map(([x, y]) => (
                    <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" />
                ))}
            </g>
            <g transform="translate(140 78)" stroke="#111" strokeWidth="4">
                <path d="M5 13h11v27H5Z" fill="#999" />
                <path d="M16 3h11v5h6v7h14v5h6v11h-6v5H33v7h-6v5H16Z" fill="#fafafa" />
                <path d="M39 23h5v6h-5Z" fill="#111" stroke="none" />
                <path d="M-7 16v5m0 6v5m0 6v4m-8-23v4m0 6v4m-9-6v4" strokeWidth="3" />
            </g>
            <Asteroid x={270} y={40} size={46} />
            <Asteroid x={206} y={150} size={39} />
            <Asteroid x={466} y={79} size={82} />
        </svg>
    );
}

function TowerPreview() {
    return (
        <svg viewBox="0 0 600 220" fill="none" aria-hidden="true">
            <g stroke="#1b1b1d" strokeWidth="1.7">
                <path d="M210 169h144v30H210Z" fill="#b9b9ba" />
                <path d="M242 140h126v25H242Z" fill="#272728" />
                <path d="M225 112h105v25H225Z" fill="#b6b6b7" />
                <path d="M242 86h104v23H242Z" fill="#2b2b2c" />
                <path d="M285 22h90v28h-90Z" fill="#29292a" />
            </g>
            <path d="M214 58h65" stroke="#6b6b72" strokeWidth="2.5" strokeDasharray="4 5" />
            <path d="m271 51 8 7-8 7" stroke="#6b6b72" strokeWidth="2.5" />
            <path d="M213 172h138M228 115h99M288 25h84" stroke="#fff" strokeOpacity=".4" />
        </svg>
    );
}

function WordPreview() {
    return (
        <svg viewBox="0 0 600 220" fill="none" aria-hidden="true">
            {["D", "L", "B", "U", "I"].map((letter, index) => (
                <g key={letter} transform={`translate(${70 + index * 94} 35)`}>
                    <rect width="78" height="73" rx="4" fill="#fafafa" stroke="#151517" strokeWidth="2.5" />
                    <path d="M5 68V5h68" stroke="#dedee0" strokeWidth="2" />
                    <text x="39" y="51" fill="#0b0b0c" textAnchor="middle" fontFamily="'Playground Pixel', monospace" fontSize="38" fontWeight="600">{letter}</text>
                </g>
            ))}
            <rect x="146" y="129" width="308" height="53" rx="3" fill="#fafafa" stroke="#252527" strokeWidth="1.8" />
            <path d="M165 141v29" stroke="#151517" strokeWidth="2" />
        </svg>
    );
}

function SnakePreview() {
    return (
        <svg viewBox="0 0 600 220" fill="none" aria-hidden="true">
            <g stroke="#e2e2e6" strokeWidth="1">
                {Array.from({ length: 17 }, (_, index) => <path key={`x${index}`} d={`M${12 + index * 36} 7v206`} />)}
                {Array.from({ length: 7 }, (_, index) => <path key={`y${index}`} d={`M12 ${7 + index * 36}h576`} />)}
            </g>
            <g fill="#161617" stroke="#09090a">
                {[[156, 43], [156, 79], [156, 115], [192, 115], [228, 115], [264, 115], [300, 115], [300, 151]].map(([x, y]) => (
                    <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width="32" height="32" />
                ))}
            </g>
            <rect x="415" y="88" width="18" height="18" fill="#adadae" stroke="#6b6b6e" />
            <path d="M418 103V91h12" stroke="#d5d5d6" />
        </svg>
    );
}

const games = [
    { id: "space-dash", number: "01", category: "Endless runner", name: "Space dash", description: "Dodge the obstacles. Stay in orbit.", Preview: SpacePreview },
    { id: "tower-stack", number: "02", category: "Precision", name: "Tower stack", description: "Time your drop. Build a little higher.", Preview: TowerPreview },
    { id: "word-scramble", number: "03", category: "Word game", name: "Word scramble", description: "Unscramble the letters. Beat the clock.", Preview: WordPreview },
    { id: "snake", number: "04", category: "Classic", name: "Snake", description: "A classic. One more bite.", Preview: SnakePreview },
];

const playableGames = new Set(["space-dash", "tower-stack", "word-scramble", "snake"]);

export default function Playground() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [selectedGame, setSelectedGame] = useState("");

    function showComingSoon(name: string) {
        setSelectedGame(name);
        dialogRef.current?.showModal();
    }

    return (
        <section className="playground" aria-labelledby="playground-heading">
            <PlaygroundMusic />
            <header className="playground-header">
                <p className="playground-eyebrow">Insert a little fun</p>
                <div className="playground-title">
                    <h1 id="playground-heading">Playground.</h1>
                    <PixelController className="playground-controller" />
                </div>
                <p className="playground-subtitle">Tiny games. Big distractions.</p>
            </header>
            <div className="playground-games">
                {games.map(({ id, number, category, name, description, Preview }) => (
                    <article key={id} className="playground-card" aria-labelledby={`${id}-heading`}>
                        <div className={`playground-preview playground-preview--${id}`}><Preview /></div>
                        <div className="playground-card-info">
                            <div className="playground-card-copy">
                                <p className="playground-category">{number} / {category}</p>
                                <h2 id={`${id}-heading`}>{name}</h2>
                                <p className="playground-description">{description}</p>
                            </div>
                            <button
                                type="button" className="playground-play"
                                aria-label={`Play ${name}`} aria-haspopup={playableGames.has(id) ? undefined : "dialog"} aria-controls={playableGames.has(id) ? undefined : "playground-coming-soon"}
                                onClick={() => playableGames.has(id) ? navigateTo(`/playground/${id}`) : showComingSoon(name)}
                            >
                                <Play aria-hidden="true" fill="currentColor" />
                                <span>Play</span>
                            </button>
                        </div>
                    </article>
                ))}
            </div>
            <footer className="playground-footer">
                <p>Pick a game. Take a break.</p>
                <span className="playground-footer-dots" aria-hidden="true" />
                <span className="playground-keyboard"><Keyboard aria-hidden="true" />Keyboard friendly.</span>
            </footer>
            <dialog ref={dialogRef} id="playground-coming-soon" className="playground-dialog" aria-labelledby="playground-dialog-heading" aria-describedby="playground-dialog-description">
                <button type="button" className="playground-dialog-close" aria-label="Close coming soon" onClick={() => dialogRef.current?.close()}><X aria-hidden="true" /></button>
                <PixelController className="playground-dialog-controller" />
                <p className="playground-eyebrow">{selectedGame}</p>
                <h2 id="playground-dialog-heading">Coming soon.</h2>
                <p id="playground-dialog-description">A little more time, a lot more fun.<br />This game is still in the works.</p>
                <button type="button" className="playground-play playground-dialog-back" onClick={() => dialogRef.current?.close()}>Back to playground</button>
            </dialog>
        </section>
    );
}
