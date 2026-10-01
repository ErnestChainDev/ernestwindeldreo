import { useCallback, useEffect, useRef, useState } from "react";

type Counts = { views: number; likes: number; visitors: number; liked: boolean; revision: number };

function readCounts(value: unknown): Counts {
    if (!value || typeof value !== "object") throw new Error("Stats unavailable");
    const counts = value as Counts;
    if (![counts.views, counts.likes, counts.visitors, counts.revision].every(number => Number.isSafeInteger(number) && number >= 0)
        || typeof counts.liked !== "boolean") throw new Error("Invalid stats response");
    return counts;
}

let memoryVisitId: string | undefined;
function getVisitId() {
    const key = "ewd:visit-id";
    try {
        const saved = sessionStorage.getItem(key);
        if (saved) return saved;
        memoryVisitId ??= crypto.randomUUID();
        sessionStorage.setItem(key, memoryVisitId);
    } catch {
        memoryVisitId ??= crypto.randomUUID();
    }
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
        let events: EventSource | undefined;
        async function connect() {
            try {
                const response = await fetch("/api/site-stats/visit", {
                    method: "POST", credentials: "same-origin", signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ visitId: getVisitId() }),
                });
                if (!response.ok) throw new Error("Live stats unavailable. Try again.");
                const value: unknown = await response.json();
                if (controller.signal.aborted) return;
                acceptCounts(value);
                setError(null);
                events = new EventSource("/api/site-stats/events");
                events.onopen = () => { setConnected(true); setError(null); };
                events.onmessage = event => {
                    try { acceptCounts(JSON.parse(event.data)); }
                    catch { setError("Live stats unavailable. Try again."); }
                };
                events.onerror = () => { setConnected(false); setError("Reconnecting to live stats…"); };
            } catch {
                if (!controller.signal.aborted) { setConnected(false); setError("Live stats unavailable. Try again."); }
            }
        }
        void connect();
        return () => { controller.abort(); events?.close(); };
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
        } catch {
            setError("Couldn't save your like. Try again.");
        } finally {
            liking.current = false;
            setPending(false);
        }
    }

    return { counts, connected, error, pending, toggleLike, retry: () => setAttempt(value => value + 1) };
}

export type SiteStats = ReturnType<typeof useSiteStats>;
