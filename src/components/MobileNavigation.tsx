import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Menu } from "lucide-react";
import BrandMark from "./BrandMark";
import Sidebar from "./Sidebar";
import type { SiteStats } from "../hooks/useSiteStats";
import "./MobileNavigation.css";

export default function MobileNavigation({ stats }: { stats: SiteStats }) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;

        const dialog = dialogRef.current;
        dialog?.showModal();

        const close = () => dialog?.close();
        const desktop = window.matchMedia("(min-width: 901px)");
        const handleResize = () => { if (desktop.matches) close(); };

        window.addEventListener("popstate", close);
        window.addEventListener("portfolio:navigate", close);
        desktop.addEventListener("change", handleResize);

        return () => {
            window.removeEventListener("popstate", close);
            window.removeEventListener("portfolio:navigate", close);
            desktop.removeEventListener("change", handleResize);
            dialog?.close();
        };
    }, [open]);

    function closeOnNavigation(event: MouseEvent<HTMLDialogElement>) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
        if (link && link.origin === window.location.origin && !link.target) dialogRef.current?.close();
    }

    return (
        <>
            <header className="home-mobile-header">
                <a className="home-brand" href="/" aria-label="Ernest Windel Dreo, overview">
                    <BrandMark />
                    <span className="home-brand-copy">
                        <span>Ernest Windel Dreo</span>
                        <small>Portfolio</small>
                    </span>
                </a>
                <button
                    type="button" className="home-menu-button"
                    aria-label="Open navigation menu" aria-expanded={open}
                    aria-controls="home-mobile-menu" aria-haspopup="dialog"
                    onClick={() => setOpen(true)}
                >
                    <Menu aria-hidden="true" />
                </button>
            </header>
            <dialog
                ref={dialogRef} id="home-mobile-menu" className="home-mobile-menu"
                aria-label="Portfolio navigation" onClose={() => setOpen(false)} onClick={closeOnNavigation}
            >
                {open && <Sidebar stats={stats} variant="mobile" onClose={() => dialogRef.current?.close()} />}
            </dialog>
        </>
    );
}
