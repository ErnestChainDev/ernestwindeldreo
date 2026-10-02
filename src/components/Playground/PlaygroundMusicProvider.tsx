import type { ReactNode } from "react";
import { PlaygroundMusicContext, useMusicPlayer } from "./use-playground-music";

export default function PlaygroundMusicProvider({ children }: { children: ReactNode }) {
    const player = useMusicPlayer();
    return <PlaygroundMusicContext value={player}>{children}</PlaygroundMusicContext>;
}
