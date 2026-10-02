import { memo, useEffect, useRef } from "react";
import HomePage from "../pages/HomePage";
import Projects from "./Projects/Projects";
import Experience from "./Experience/Experience";
import Stack from "./Stack/Stack";
import Certifications from "./Certifications/Certifications";
import PortfolioAI from "./PortfolioAI/PortfolioAI";
import TypingTest from "./TypingTest/TypingTest";
import Contact from "./Contact/Contact";
import Playground from "./Playground/Playground";
import SpaceDash from "./Playground/SpaceDash/SpaceDash";
import TowerStack from "./Playground/TowerStack/TowerStack";
import Snake from "./Playground/Snake/Snake";
import WordScramble from "./Playground/WordScramble/WordScramble";
import { usePathname } from "../lib/navigation";

const gamePages = {
    "/playground/snake": Snake,
    "/playground/space-dash": SpaceDash,
    "/playground/tower-stack": TowerStack,
    "/playground/word-scramble": WordScramble,
};

const pages = {
    projects: Projects,
    experience: Experience,
    stack: Stack,
    certifications: Certifications,
    contact: Contact,
    playground: Playground,
};

function PortfolioContent({ tourActive, hasToured, onStartTour }: { tourActive: boolean; hasToured: boolean; onStartTour: () => void }) {
    const pathname = usePathname();
    const gamePath = pathname.replace(/\/$/, "");
    const GameContent = Object.hasOwn(gamePages, gamePath) ? gamePages[gamePath as keyof typeof gamePages] : undefined;
    const contentRef = useRef<HTMLDivElement>(null);
    const section = pathname.split("/")[1] || "";
    const PageContent = Object.hasOwn(pages, section) ? pages[section as keyof typeof pages] : undefined;

    useEffect(() => {
        const heading = contentRef.current?.querySelector<HTMLElement>("h1");
        if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
        }
    }, [pathname]);

    return (
        <div key={pathname} className="portfolio-content" ref={contentRef}>
            {GameContent ? <GameContent /> : section === "ask" ? <PortfolioAI /> : section === "typing-test" ? <TypingTest /> : !section ? <HomePage tourActive={tourActive} hasToured={hasToured} onStartTour={onStartTour} /> : (
                <main className={`portfolio-page${section === "contact" ? " contact-page" : section === "playground" ? " playground-page" : ""}`}>
                    {PageContent ? <PageContent /> : (
                        <div className="portfolio-unavailable">
                            <h1>Coming soon.</h1>
                            <p>This part of the portfolio is still in progress.</p>
                            <a href="/">Back to overview</a>
                        </div>
                    )}
                </main>
            )}
        </div>
    );
}

// Live sidebar statistics should not rerender the current page.
export default memo(PortfolioContent);
