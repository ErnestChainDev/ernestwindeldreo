import { lazy, memo, Suspense, useEffect, useRef } from "react";
import HomePage from "../pages/HomePage";
import { usePathname } from "../lib/navigation";

const Projects = lazy(() => import("./Projects/Projects"));
const Experience = lazy(() => import("./Experience/Experience"));
const Stack = lazy(() => import("./Stack/Stack"));
const Certifications = lazy(() => import("./Certifications/Certifications"));
const PortfolioAI = lazy(() => import("./PortfolioAI/PortfolioAI"));
const TypingTest = lazy(() => import("./TypingTest/TypingTest"));
const Contact = lazy(() => import("./Contact/Contact"));
const Playground = lazy(() => import("./Playground/Playground"));
const SpaceDash = lazy(() => import("./Playground/SpaceDash/SpaceDash"));
const TowerStack = lazy(() => import("./Playground/TowerStack/TowerStack"));
const Snake = lazy(() => import("./Playground/Snake/Snake"));
const WordScramble = lazy(() => import("./Playground/WordScramble/WordScramble"));

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
        const content = contentRef.current;
        if (!content) return;
        const focusHeading = () => {
            const heading = content.querySelector<HTMLElement>("h1");
            if (!heading) return false;
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
            return true;
        };
        if (focusHeading()) return;
        const observer = new MutationObserver(() => { if (focusHeading()) observer.disconnect(); });
        observer.observe(content, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [pathname]);

    return (
        <div key={pathname} className="portfolio-content" ref={contentRef}>
            <Suspense fallback={<main className="portfolio-page"><p role="status">Opening page…</p></main>}>
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
            </Suspense>
        </div>
    );
}

// Live sidebar statistics should not rerender the current page.
export default memo(PortfolioContent);
