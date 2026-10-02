import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { musicTracks } from "./music-tracks";

const PREFERENCES_KEY = "ewd:playground-music";
const DEFAULT_VOLUME = .35;
type Preferences = { trackId: string; volume: number; muted: boolean };
type Playback = { index: number; playing: boolean; loading: boolean; time: number; duration: number; error: string };
function readPreferences(): Preferences {
    const defaults = { trackId: musicTracks[0]?.id ?? "", volume: DEFAULT_VOLUME, muted: false };
    try {
        const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "null");
        if (!saved || typeof saved !== "object") return defaults;
        return {
            trackId: musicTracks.some(track => track.id === saved.trackId) ? saved.trackId : defaults.trackId,
            volume: typeof saved.volume === "number" && Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : defaults.volume,
            muted: saved.muted === true,
        };
    } catch { return defaults; }
}

export const PlaygroundMusicContext = createContext<ReturnType<typeof useMusicPlayer> | null>(null);

export function usePlaygroundMusic() {
    const player = useContext(PlaygroundMusicContext);
    if (!player) throw new Error("Playground music requires PlaygroundMusicProvider.");
    return player;
}

// The provider owns the audio element across page and game navigation.
export function useMusicPlayer() {
    const [preferences, setPreferences] = useState(readPreferences);
    const [playback, setPlayback] = useState<Playback>(() => ({ index: Math.max(0, musicTracks.findIndex(track => track.id === preferences.trackId)), playing: false, loading: false, time: 0, duration: 0, error: "" }));
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const indexRef = useRef(playback.index);
    const preferencesRef = useRef(preferences);
    const requestRef = useRef(0);
    const pendingRef = useRef(false);

    const updatePreferences = useCallback((change: Partial<Preferences>) => {
        const next = { ...preferencesRef.current, ...change };
        preferencesRef.current = next;
        setPreferences(next);
        if (audioRef.current) {
            audioRef.current.volume = next.volume;
            audioRef.current.muted = next.muted;
        }
        try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next)); } catch { /* Music also works without storage. */ }
    }, []);

    const invalidatePlayback = useCallback(() => { ++requestRef.current; pendingRef.current = false; }, []);

    const playTrack = useCallback(async (index: number) => {
        const audio = audioRef.current;
        const track = musicTracks[index];
        if (!audio || !track) return;
        const request = ++requestRef.current;
        const changed = index !== indexRef.current;
        indexRef.current = index;
        pendingRef.current = true;
        if (changed || audio.error || !audio.src) {
            audio.pause();
            audio.src = track.src;
            audio.load();
        }
        updatePreferences({ trackId: track.id });
        setPlayback(current => ({ ...current, index, loading: true, error: "", ...(changed ? { time: 0, duration: 0, playing: false } : {}) }));
        try {
            await audio.play();
            if (request === requestRef.current) {
                pendingRef.current = false;
                setPlayback(current => ({ ...current, playing: !audio.paused, loading: false }));
            }
        } catch (error) {
            if (request !== requestRef.current) return;
            pendingRef.current = false;
            const message = error instanceof DOMException && error.name === "NotAllowedError" ? "Tap play to start the music." : "Couldn't play this track. Try again or choose another.";
            setPlayback(current => ({ ...current, playing: false, loading: false, error: message }));
        }
    }, [updatePreferences]);

    useEffect(() => {
        const audio = new Audio();
        audio.preload = "none";
        audio.volume = preferencesRef.current.volume;
        audio.muted = preferencesRef.current.muted;
        if (musicTracks[indexRef.current]) audio.src = musicTracks[indexRef.current].src;
        audioRef.current = audio;
        const sync = () => setPlayback(current => ({ ...current,
            time: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
            duration: Number.isFinite(audio.duration) ? audio.duration : 0,
            playing: !audio.paused && !audio.ended,
        }));
        const playing = () => { sync(); setPlayback(current => ({ ...current, loading: false, error: "" })); };
        const waiting = () => { if (!audio.paused) setPlayback(current => ({ ...current, loading: true })); };
        const error = () => {
            pendingRef.current = false;
            setPlayback(current => ({ ...current, playing: false, loading: false, error: "Couldn't load this track. Try another one." }));
        };
        const ended = () => { void playTrack((indexRef.current + 1) % musicTracks.length); };
        const syncEvents = ["timeupdate", "loadedmetadata", "durationchange", "pause", "seeking", "seeked", "play"] as const;
        syncEvents.forEach(event => audio.addEventListener(event, sync));
        audio.addEventListener("playing", playing);
        audio.addEventListener("waiting", waiting);
        audio.addEventListener("error", error);
        audio.addEventListener("ended", ended);
        return () => {
            invalidatePlayback();
            syncEvents.forEach(event => audio.removeEventListener(event, sync));
            audio.removeEventListener("playing", playing);
            audio.removeEventListener("waiting", waiting);
            audio.removeEventListener("error", error);
            audio.removeEventListener("ended", ended);
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
            audioRef.current = null;
        };
    }, [playTrack, invalidatePlayback]);

    function togglePlay() {
        const audio = audioRef.current;
        if (!audio) return;
        if (!audio.paused || pendingRef.current) {
            ++requestRef.current;
            pendingRef.current = false;
            audio.pause();
            setPlayback(current => ({ ...current, playing: false, loading: false }));
        } else void playTrack(indexRef.current);
    }
    function seek(time: number) {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        audio.currentTime = Math.max(0, Math.min(time, audio.duration));
        setPlayback(current => ({ ...current, time: audio.currentTime }));
    }
    function toggleMute() {
        const previous = preferencesRef.current;
        if (previous.muted || previous.volume === 0) updatePreferences({ muted: false, volume: previous.volume || DEFAULT_VOLUME });
        else updatePreferences({ muted: true });
    }
    function setVolume(volume: number) { updatePreferences({ volume: Math.max(0, Math.min(1, volume)), muted: false }); }

    return { ...playback, volume: preferences.volume, muted: preferences.muted || preferences.volume === 0,
        playTrack, togglePlay, seek, toggleMute, setVolume,
        next: () => { void playTrack((indexRef.current + 1) % musicTracks.length); },
        previous: () => { void playTrack((indexRef.current + musicTracks.length - 1) % musicTracks.length); },
    };
}
