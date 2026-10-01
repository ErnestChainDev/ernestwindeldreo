import { useSyncExternalStore, type MouseEvent } from "react";

const NAVIGATION_EVENT = "portfolio:navigate";

function subscribe(onChange: () => void) {
    window.addEventListener("popstate", onChange);
    window.addEventListener(NAVIGATION_EVENT, onChange);
    return () => {
        window.removeEventListener("popstate", onChange);
        window.removeEventListener(NAVIGATION_EVENT, onChange);
    };
}

function getPathname() {
    return window.location.pathname;
}

export function usePathname() {
    return useSyncExternalStore(subscribe, getPathname);
}

export function navigateTo(href: string) {
    if (href === window.location.pathname + window.location.search) return;

    const state = ["/ask", "/typing-test"].includes(href.split("?")[0]) ? { portfolioReturnTo: window.location.pathname + window.location.search } : null;
    window.history.pushState(state, "", href);
    window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

// Keep native anchor behavior for external links, downloads, and new tabs.
export function handleInternalNavigation(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!link || !event.currentTarget.contains(link) || link.hasAttribute("download")
        || (link.target && link.target !== "_self") || link.relList.contains("external")) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    const url = new URL(link.href);
    if (url.origin !== window.location.origin || url.hash) return;

    event.preventDefault();
    navigateTo(url.pathname + url.search);
}
