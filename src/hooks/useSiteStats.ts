import { useCallback, useEffect, useRef, useState } from "react";

type Counts = { views: number; likes: number; visitors: number; liked: boolean; revision: number };
const POLL_INTERVAL = 10_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function readCounts(value: unknown): Counts {
    if (!value || typeof value !== "object") throw new Error("Stats unavailable");
    const counts = value as Counts;
    if (![counts.views, counts.likes, counts.visitors, counts.revision].every(number => Number.isSafeInteger(number) && number >= 0) || typeof counts.liked !== "boolean") throw new Error("Invalid stats response");
    return counts;
}
let memoryVisitId: string | undefined;
function getVisitId() {
    const key = "ewd:visit-id";
    try {
        const saved = sessionStorage.getItem(key);
        if (saved && UUID.test(saved)) return saved;
        memoryVisitId ??= crypto.randomUUID();
        sessionStorage.setItem(key, memoryVisitId);
    } catch { memoryVisitId ??= crypto.randomUUID(); }
    return memoryVisitId;
}
export function useSiteStats() {
    const [counts, setCounts] = useState<Counts | null>(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const liking = useRef(false);
    const acceptCounts = useCallback((value: unknown) => {
        const next = readCounts(value);
        setCounts(previous => !previous || next.revision >= previous.revision ? next : previous);
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let registered = false;
        let inFlight = false;
        async function refresh() {
            if (inFlight || controller.signal.aborted) return;
            if (registered && document.hidden) { timer = setTimeout(refresh, POLL_INTERVAL); return; }
            inFlight = true;
            try {
                const response = await fetch(registered ? "/api/site-stats" : "/api/site-stats/visit", {
                    method: registered ? "GET" : "POST", credentials: "same-origin", signal: controller.signal,
                    cache: "no-store",
                    ...(registered ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitId: getVisitId() }) }),
                });
                if (!response.ok) throw new Error("Stats unavailable");
                const value: unknown = await response.json();
                if (controller.signal.aborted) return;
                acceptCounts(value);
                registered = true;
                setConnected(true);
                setError(null);
            } catch {
                if (!controller.signal.aborted) { setConnected(false); setError("Stats unavailable. Try again."); }
            } finally {
                inFlight = false;
                if (!controller.signal.aborted) timer = setTimeout(refresh, registered ? POLL_INTERVAL : 5000);
            }
        }
        const resume = () => { if (!document.hidden) { clearTimeout(timer); void refresh(); } };
        document.addEventListener("visibilitychange", resume);
        window.addEventListener("online", resume);
        void refresh();
        return () => {
            controller.abort(); clearTimeout(timer);
            document.removeEventListener("visibilitychange", resume);
            window.removeEventListener("online", resume);
        };
    }, [acceptCounts, attempt]);
    async function toggleLike() {
        if (!counts || liking.current || !connected) return;
        liking.current = true;
        setPending(true);
        try {
            const response = await fetch("/api/site-stats/like", {
                method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ liked: !counts.liked }),
            });
            if (!response.ok) throw new Error("Like failed");
            acceptCounts(await response.json());
            setError(null);
        } catch { setError("Couldn't save your like. Try again."); }
        finally { liking.current = false; setPending(false); }
    }
    return { counts, connected, error, pending, toggleLike, retry: () => setAttempt(value => value + 1) };
}
export type SiteStats = ReturnType<typeof useSiteStats>;
