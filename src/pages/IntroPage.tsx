import logo from "../assets/Logo.png";
import DotGrid from "../components/DotGrid";
import "./IntroPage.css";

type IntroPageProps = {
    onEnter: () => void;
};

export default function IntroPage({ onEnter }: IntroPageProps) {
    return (
        <main className="intro-screen" onClick={onEnter}>
            <header className="intro-header">
                <div className="intro-identity">
                    <span className="intro-logo-crop intro-header-logo">
                        <img src={logo} alt="EWD logo" draggable={false} />
                    </span>
                    <span className="intro-identity-divider" aria-hidden="true" />
                    <div className="intro-identity-copy">
                        <p className="intro-name">Ernest Windel Dreo</p>
                        <p className="intro-subtitle">Personal portfolio</p>
                    </div>
                </div>
                <p className="intro-header-note">Design / Code / Create</p>
            </header>

            <section className="intro-hero" aria-labelledby="intro-title">
                <div className="intro-dot-accent" aria-hidden="true">
                    <DotGrid
                        dotSize={1.5}
                        gap={11}
                        baseColor="#aaa5b1"
                        interactive={false}
                    />
                </div>
                <div className="intro-hero-copy">
                    <p className="intro-eyebrow">Welcome to my digital space</p>

                    <h1 id="intro-title" className="intro-title">
                        <span>Ideas into</span>
                        <span>code. Code</span>
                        <span>into impact.</span>
                    </h1>

                    <p className="intro-description">
                        Full-stack development, AI, and thoughtful web design.
                    </p>

                    <button type="button" className="intro-enter-button">
                        Enter Portfolio
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path d="M5 19 19 5M5 5h14v14" />
                        </svg>
                    </button>
                </div>

                <div className="intro-orbit" aria-hidden="true">
                    <div className="intro-orbit-dots">
                        <DotGrid
                            dotSize={2}
                            gap={15}
                            baseColor="#b8b4c0"
                            activeColor="#837b90"
                            proximity={110}
                            maxSpeed={800}
                            shockStrength={0}
                        />
                    </div>
                    <div className="intro-orbit-markers">
                        <span className="intro-crosshair intro-crosshair-top" />
                        <span className="intro-crosshair intro-crosshair-right" />
                        <span className="intro-crosshair intro-crosshair-bottom" />
                        <span className="intro-crosshair intro-crosshair-left" />
                    </div>
                    <span className="intro-logo-crop intro-hero-logo">
                        <img src={logo} alt="" draggable={false} />
                    </span>
                </div>
            </section>

            <footer className="intro-footer">
                <span>Based in the Philippines</span>
                <span>Take a look around.</span>
            </footer>
        </main>
    );
}
