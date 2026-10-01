const sources = import.meta.glob<string>("./music/*.mp3", { eager: true, query: "?url", import: "default" });
const catalog = [
    { match: "Sparkle", id: "sparkle", title: "Sparkle", artist: "Your Name · Soundtrack", artwork: "stars" },
    { match: "Zen Zen Zense", id: "zen-zen-zense", title: "Zen Zen Zense", artist: "RADWIMPS · Your Name", artwork: "waves" },
    { match: "Gurenge", id: "gurenge", title: "Gurenge", artist: "LiSA · Demon Slayer", artwork: "flame" },
] as const;

export const musicTracks = catalog.flatMap(track => {
    const source = Object.entries(sources).find(([path]) => path.includes(track.match));
    return source ? [{ ...track, src: source[1] }] : [];
});
export type MusicTrack = (typeof musicTracks)[number];
