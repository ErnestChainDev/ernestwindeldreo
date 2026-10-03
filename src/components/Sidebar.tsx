import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, ArrowUpRight, Award, BriefcaseBusiness, ChevronRight, Folder, Gamepad2, Heart, House, Keyboard, Layers, MessageSquare, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import BrandMark from "./BrandMark";
import ArrowNarrowRightIcon from "./ui/arrow-narrow-right-icon";
import { AvatarGroup } from "./animate-ui/components/animate/avatar-group";
import type { SiteStats } from "../hooks/useSiteStats";
import { navigateTo, usePathname } from "../lib/navigation";
import avatar1 from "../assets/avatargroup/avatar1.webp";
import avatar2 from "../assets/avatargroup/avatar2.webp";
import avatar3 from "../assets/avatargroup/avatar3.webp";
import avatar4 from "../assets/avatargroup/avatar4.webp";
import avatar5 from "../assets/avatargroup/avatar5.webp";
import avatar6 from "../assets/avatargroup/avatar6.webp";
import "./Sidebar.css";

const navigation = [
    { label: "Overview", href: "/", icon: House },
    { label: "Projects", href: "/projects", icon: Folder },
    { label: "Experience", href: "/experience", icon: BriefcaseBusiness },
    { label: "Stack", href: "/stack", icon: Layers },
    { label: "Certifications", href: "/certifications", icon: Award },
];

const shortcuts = [
    { label: "Ask anything", href: "/ask", icon: MessageSquare, key: "Y" },
    { label: "Typing test", href: "/typing-test", icon: Keyboard, key: "X" },
];

const avatarImages = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];
const avatarSlots = [0, 1, 2];
const AVATAR_ROTATION_MS = 2600;

function subscribeToMotionPreference(onChange: () => void) {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
}

function getMotionPreference() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function CommunityAvatars() {
    const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, getMotionPreference);
    const [step, setStep] = useState(0);

    useEffect(() => {
        // Warm the next portraits before their first crossfade.
        avatarImages.forEach(src => { new Image().src = src; });
    }, []);

    useEffect(() => {
        if (reducedMotion) return;

        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                setStep(previous => (previous + 1) % avatarImages.length);
            }
        }, AVATAR_ROTATION_MS);

        return () => window.clearInterval(interval);
    }, [reducedMotion]);

    return (
        <div className="home-visitors" aria-hidden="true">
            <AvatarGroup className="home-avatar-group" translate={reducedMotion ? 0 : "-12%"}>
                {avatarSlots.map(slot => {
                    // Replace one portrait at a time, without repeating a visible image.
                    const alternate = step > slot && step <= slot + avatarSlots.length;
                    const src = avatarImages[slot + (alternate ? avatarSlots.length : 0)];

                    return (
                        <span className="home-avatar" key={slot}>
                            <AnimatePresence initial={false}>
                                <motion.img
                                    key={src}
                                    src={src}
                                    alt=""
                                    draggable={false}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: reducedMotion ? 0 : 0.55 }}
                                />
                            </AnimatePresence>
                        </span>
                    );
                })}
            </AvatarGroup>
        </div>
    );
}

function formatCount(value: number | undefined) {
    return value === undefined ? "—" : value.toLocaleString();
}

function NavigationArrow({ active }: { active: boolean }) {
    const Icon = active ? ArrowRight : ChevronRight;
    return <Icon className="home-nav-arrow" aria-hidden="true" />;
}

type SidebarProps = {
    stats: SiteStats;
    variant?: "desktop" | "mobile";
    onClose?: () => void;
};

export default function Sidebar({ stats, variant = "desktop", onClose }: SidebarProps) {
    const pathname = usePathname();
    const section = pathname.split("/")[1];
    const activePage = section ? `/${section}` : "/";
    const { counts, connected, error, pending, toggleLike, retry } = stats;
    const mobile = variant === "mobile";

    useEffect(() => {
        // The persistent desktop instance owns shortcuts even while hidden on mobile.
        if (variant === "mobile") return;

        function handleShortcut(event: KeyboardEvent) {
            if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
            if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']")) return;

            const shortcut = shortcuts.find(item => item.key.toLowerCase() === event.key.toLowerCase());
            if (!shortcut) return;

            event.preventDefault();
            navigateTo(shortcut.href);
        }

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [variant]);

    const playgroundLink = (
        <a
            href="/playground" data-tour="nav-playground" className={`home-nav-link home-playground${activePage === "/playground" ? " is-active" : ""}`}
            aria-current={activePage === "/playground" ? "page" : undefined} title="Playground"
        >
            <Gamepad2 aria-hidden="true" />
            <span>Playground</span>
            <NavigationArrow active={activePage === "/playground"} />
        </a>
    );

    return (
        <aside className={`home-sidebar${mobile ? " home-sidebar-mobile" : ""}`} aria-label="Portfolio sidebar">
            <div className="home-sidebar-heading">
                <a className="home-brand" href="/" aria-label="Ernest Windel Dreo, overview">
                    <BrandMark />
                    <span className="home-brand-copy">
                        <span>Ernest Windel Dreo</span>
                        <small>Portfolio</small>
                    </span>
                </a>
                {mobile && <button type="button" className="home-menu-button" onClick={onClose} aria-label="Close navigation menu" autoFocus><X aria-hidden="true" /></button>}
            </div>

            <nav className="home-nav" aria-label="Main navigation">
                <div className="home-nav-primary">
                    {navigation.map(({ label, href, icon: Icon }) => {
                        const active = activePage === href;

                        return (
                            <a
                                key={href} href={href} data-tour={`nav-${href === "/" ? "overview" : href.slice(1)}`}
                                className={`home-nav-link${active ? " is-active" : ""}`}
                                aria-current={active ? "page" : undefined} title={label}
                            >
                                {active ? (
                                    <div className="home-nav-active-icon" aria-hidden="true">
                                        <ArrowNarrowRightIcon />
                                    </div>
                                ) : <Icon aria-hidden="true" />}
                                <span>{label}</span>
                                {!active && <NavigationArrow active={false} />}
                            </a>
                        );
                    })}
                </div>
                <div className="home-nav-tools">
                    {shortcuts.map(({ label, href, icon: Icon, key }) => (
                        <a
                            key={href} href={href} data-tour={`nav-${href.slice(1)}`}
                            className={`home-nav-link home-tool-link${activePage === href ? " is-active" : ""}`}
                            aria-current={activePage === href ? "page" : undefined}
                            aria-keyshortcuts={`Alt+${key}`} title={`${label} (Alt + ${key})`}
                        >
                            <Icon className="home-tool-icon" aria-hidden="true" />
                            <span>{label}</span>
                            <span className="home-shortcut" aria-hidden="true"><kbd>Alt</kbd><span>+</span><kbd>{key}</kbd></span>
                            <NavigationArrow active={activePage === href} />
                        </a>
                    ))}
                </div>
            </nav>

            {mobile && playgroundLink}

            <div className="home-community" data-tour="community">
                <CommunityAvatars />
                <button
                    type="button" className="home-like-button" data-tour="likes"
                    onClick={() => void toggleLike()} disabled={!connected || pending || !counts}
                    aria-pressed={counts?.liked ?? false}
                    aria-label={counts?.liked ? "Unlike this portfolio" : "Like this portfolio"}
                    title={counts?.liked ? "Unlike this portfolio" : "Like this portfolio"}
                >
                    <Heart aria-hidden="true" fill={counts?.liked ? "currentColor" : "none"} />
                    <span aria-live="polite" aria-atomic="true">{formatCount(counts?.likes)} {counts?.likes === 1 ? "like" : "likes"}</span>
                </button>
                <span className="home-view-count" data-tour="views" aria-live="polite" aria-atomic="true" title="One view per browser-tab visit; refreshing does not add a view.">
                    <strong>{formatCount(counts?.views)}</strong> people views
                </span>
                {error && <button className="home-stats-retry" type="button" onClick={retry} title={error}>Stats unavailable · Retry</button>}
            </div>

            {!mobile && playgroundLink}

            <footer className="home-sidebar-footer">
                <p className="home-contact-eyebrow">Have a project in mind?</p>
                <p className="home-contact-heading">Let’s build something.</p>
                <a href="/contact" className="home-get-in-touch">Get in touch <ArrowUpRight aria-hidden="true" /></a>
            </footer>
        </aside>
    );
}
