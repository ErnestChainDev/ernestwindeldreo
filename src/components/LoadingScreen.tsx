import { useEffect, useId, useRef, useState } from "react";
import logo from "../assets/Logo.webp";
import "./LoadingScreen.css";

const DURATION = 1800;

type LoadingScreenProps = {
    onComplete: () => void;
};

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0);
    const completeRef = useRef(onComplete);
    const artworkId = useId();

    useEffect(() => {
        // Keep the viewport still, then restore scrolling for the portfolio.
        const root = document.documentElement;
        const body = document.body;
        const previousRootOverflow = root.style.overflow;
        const previousBodyOverflow = body.style.overflow;

        root.style.overflow = "hidden";
        body.style.overflow = "hidden";

        return () => {
            root.style.overflow = previousRootOverflow;
            body.style.overflow = previousBodyOverflow;
        };
    }, []);

    useEffect(() => {
        completeRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        let frameId: number;
        let startedAt: number | undefined;

        function animate(timestamp: number) {
            startedAt ??= timestamp;

            const nextProgress = Math.min(
                ((timestamp - startedAt) / DURATION) * 100,
                100,
            );

            setProgress(Math.floor(nextProgress));

            if (nextProgress < 100) {
                frameId = requestAnimationFrame(animate);
            } else {
                completeRef.current();
            }
        }

        frameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frameId);
    }, []);

    return (
        <main className="loading-screen" aria-label="Opening portfolio">
            <header className="loading-identity">
                <p className="loading-name">Ernest Windel Dreo</p>
                <p className="loading-subtitle">Portfolio</p>
            </header>

            <div className="loading-artwork" aria-hidden="true">
                <svg viewBox="0 0 680 680" fill="none" focusable="false">
                    <defs>
                        <pattern
                            id={`${artworkId}-dots`}
                            width="26"
                            height="26"
                            patternUnits="userSpaceOnUse"
                        >
                            <circle cx="2" cy="2" r="0.75" fill="#96969b" />
                        </pattern>
                        <radialGradient id={`${artworkId}-fade`}>
                            <stop offset="68%" stopColor="white" />
                            <stop offset="100%" stopColor="black" />
                        </radialGradient>
                        <mask id={`${artworkId}-mask`}>
                            <circle
                                cx="340"
                                cy="340"
                                r="340"
                                fill={`url(#${artworkId}-fade)`}
                            />
                        </mask>
                    </defs>

                    <path
                        d="M0 0h680v680H0z"
                        fill={`url(#${artworkId}-dots)`}
                        mask={`url(#${artworkId}-mask)`}
                        opacity="0.8"
                    />

                    <g className="loading-orbit loading-orbit-outer">
                        <circle
                            className="loading-orbit-line"
                            cx="340"
                            cy="340"
                            r="286"
                            pathLength="360"
                            strokeDasharray="88 12 257 3"
                        />
                        <circle
                            className="loading-orbit-accent"
                            cx="340"
                            cy="340"
                            r="286"
                            pathLength="360"
                            strokeDasharray="29 331"
                            transform="rotate(-82 340 340)"
                        />
                        <circle cx="143.5" cy="132.2" r="8.5" fill="currentColor" />
                    </g>

                    <g className="loading-orbit loading-orbit-middle">
                        <circle className="loading-orbit-line" cx="340" cy="340" r="216" />
                        <circle
                            className="loading-orbit-accent"
                            cx="340"
                            cy="340"
                            r="216"
                            pathLength="360"
                            strokeDasharray="24 336"
                            transform="rotate(-152 340 340)"
                        />
                        <circle cx="504.2" cy="199.1" r="8.5" fill="#fdfdfd" stroke="currentColor" strokeWidth="2.5" />
                        <circle cx="262.6" cy="541.7" r="8.5" fill="currentColor" />
                    </g>

                    <g className="loading-orbit loading-orbit-inner">
                        <circle className="loading-orbit-line" cx="340" cy="340" r="160" />
                        <circle
                            className="loading-orbit-accent"
                            cx="340"
                            cy="340"
                            r="160"
                            pathLength="360"
                            strokeDasharray="20 340"
                            transform="rotate(44 340 340)"
                        />
                    </g>

                    {/* Crop the transparent padding around the existing logo. */}
                    <svg x="210" y="270" width="260" height="196" viewBox="110 418 1754 1320">
                        <image className="loading-logo" href={logo} width="2000" height="2000" />
                    </svg>
                </svg>
            </div>

            <section className="loading-details" aria-labelledby="loading-message">
                <h1 id="loading-message" className="loading-message" role="status">
                    Loading your next experience.
                </h1>

                <div className="loading-progress">
                    <div className="loading-progress-labels" aria-hidden="true">
                        <span>Loading</span>
                        <span>{String(progress).padStart(2, "0")}%</span>
                    </div>
                    <div
                        className="loading-progress-track"
                        role="progressbar"
                        aria-label="Portfolio loading progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                    >
                        <div
                            className="loading-progress-fill"
                            style={{ transform: `scaleX(${progress / 100})` }}
                        />
                    </div>
                </div>

                <p className="loading-note">A little patience. A lot of possibilities.</p>
            </section>

            <footer className="loading-footer">Design / Code / Create</footer>
        </main>
    );
}
