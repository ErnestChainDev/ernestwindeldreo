import { useEffect, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import MobileNavigation from "./MobileNavigation";
import type { SiteStats } from "../hooks/useSiteStats";
import { handleInternalNavigation, usePathname } from "../lib/navigation";
import "./PortfolioLayout.css";

export default function PortfolioLayout({ children, stats }: { children: ReactNode; stats: SiteStats }) {
    const pathname = usePathname();
    const section = pathname.split("/")[1];
    const fullscreen = pathname.replace(/\/$/, "") === "/playground/snake" ? "snake" : pathname.replace(/\/$/, "") === "/playground/word-scramble" ? "word-scramble" : pathname.replace(/\/$/, "") === "/playground/tower-stack" ? "tower-stack" : pathname.replace(/\/$/, "") === "/playground/space-dash" ? "space-dash" : section === "ask" ? "assistant" : section === "typing-test" ? "typing-test" : null;
    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        const rootOverflow = root.style.overflow;
        const bodyOverflow = body.style.overflow;

        root.style.overflow = "hidden";
        body.style.overflow = "hidden";

        return () => {
            root.style.overflow = rootOverflow;
            body.style.overflow = bodyOverflow;
        };
    }, []);

    return (
        <div className={`home-shell${fullscreen ? ` home-shell--${fullscreen}` : ""}`} onClick={handleInternalNavigation}>
            <Sidebar stats={stats} />
            <MobileNavigation stats={stats} />
            {children}
        </div>
    );
}
