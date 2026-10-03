import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import BrandMark from "../BrandMark";
import { handleInternalNavigation } from "../../lib/navigation";
import "../PortfolioLayout.css";
import "./Workspace.css";

function ConstructionCone() {
    return (
        <div className="workspace-cone" aria-hidden="true">
            <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 61 12 67c-2 1-2 5 1 5h54c3 0 3-4 1-5l-10-6" />
                <path d="M35 12c1-5 9-5 10 0l15 51c-11 4-29 4-40 0Z" />
                <path d="M33 21c4 2 10 2 14 0M30 31c6 3 14 3 20 0M27 41c8 4 18 4 26 0M24 52c10 4 22 4 32 0M15 68h50" />
            </svg>
        </div>
    );
}

export default function Workspace() {
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        document.title = "Workspace | Ernest Windel Dreo";
        // Show the page before moving keyboard focus to its heading.
        let focusFrame: number | undefined;
        const paintFrame = requestAnimationFrame(() => {
            focusFrame = requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
        });
        return () => {
            cancelAnimationFrame(paintFrame);
            if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
        };
    }, []);

    return (
        <div className="home-shell home-shell--workspace" onClick={handleInternalNavigation}>
            <div className="portfolio-content">
                <main className="workspace-page">
                    <header className="workspace-header">
                        <a className="workspace-brand" href="/" title="Back to overview">
                            <BrandMark />
                            <span className="workspace-brand-copy">
                                <span>Ernest Windel Dreo</span>
                                <small>Portfolio</small>
                            </span>
                        </a>
                        <a className="workspace-back" href="/">
                            <ArrowLeft aria-hidden="true" />
                            <span>Back to portfolio</span>
                        </a>
                    </header>

                    <section className="workspace-content" aria-labelledby="workspace-heading">
                        <ConstructionCone />
                        <span className="workspace-status"><span aria-hidden="true" />Under development</span>
                        <p className="workspace-eyebrow">Work in progress</p>
                        <h1 id="workspace-heading" ref={headingRef} tabIndex={-1}>Still building this.</h1>
                        <p className="workspace-subtitle">A little more code. A little more care.</p>
                        <p className="workspace-description">This page is under development. Check back soon for something new.</p>
                        <a className="workspace-overview" href="/">
                            <ArrowLeft aria-hidden="true" />
                            Back to overview
                        </a>
                    </section>

                    <footer className="workspace-footer">
                        <span>Ernest Windel Dreo</span>
                        <span>Good things take a little time.</span>
                    </footer>
                </main>
            </div>
        </div>
    );
}
