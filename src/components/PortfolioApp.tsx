import { lazy, Suspense, useCallback, useState } from "react";
import type { SiteStats } from "../hooks/useSiteStats";
import PortfolioLayout from "./PortfolioLayout";
import PortfolioContent from "./PortfolioContent";
import PlaygroundMusicProvider from "./Playground/PlaygroundMusicProvider";

const HomeTour = lazy(() => import("./HomeTour"));

export default function PortfolioApp({ stats, startTour }: { stats: SiteStats; startTour: boolean }) {
    const [tourActive, setTourActive] = useState(startTour);
    const [hasToured, setHasToured] = useState(false);
    const handleStartTour = useCallback(() => setTourActive(true), []);
    const handleCloseTour = useCallback(() => {
        setTourActive(false);
        setHasToured(true);
        if (window.location.pathname === "/") {
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".home-tour-trigger")?.focus({ preventScroll: true }));
        }
    }, []);

    return (
        <PlaygroundMusicProvider>
            <PortfolioLayout stats={stats}>
                <PortfolioContent tourActive={tourActive} hasToured={hasToured} onStartTour={handleStartTour} />
                {tourActive && <Suspense fallback={null}><HomeTour onClose={handleCloseTour} /></Suspense>}
            </PortfolioLayout>
        </PlaygroundMusicProvider>
    );
}
