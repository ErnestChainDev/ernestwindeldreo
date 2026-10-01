export const ROUND_SECONDS = 30;
export const ROUND_COUNT = 10;
export type WordEntry = { word: string; hint: string; alternatives?: string[] };
export const WORDS: WordEntry[] = [
    { word: "BUILD", hint: "To make something by putting its parts together." },
    { word: "CLOUD", hint: "A white or gray shape floating in the sky." },
    { word: "BRICK", hint: "A small rectangular block used to make walls." },
    { word: "CHAIR", hint: "A seat for one person, usually with a back." },
    { word: "TABLE", hint: "Furniture with a flat top and legs.", alternatives: ["BLEAT"] },
    { word: "WATER", hint: "What you drink when you are thirsty." },
    { word: "HOUSE", hint: "A building that someone calls home." },
    { word: "MUSIC", hint: "Sounds arranged into a melody or rhythm." },
    { word: "PAPER", hint: "A thin sheet you can write or draw on." },
    { word: "APPLE", hint: "A round fruit that can be red or green." },
    { word: "LIGHT", hint: "What helps you see in the dark." },
    { word: "QUIET", hint: "Making very little noise." },
    { word: "OCEAN", hint: "A very large body of salt water.", alternatives: ["CANOE"] },
    { word: "EARTH", hint: "The planet we call home.", alternatives: ["HEART", "HATER"] },
    { word: "SMILE", hint: "A happy expression on your face.", alternatives: ["SLIME", "MILES"] },
    { word: "STONE", hint: "A small piece of rock.", alternatives: ["TONES", "NOTES", "ONSET"] },
    { word: "DREAM", hint: "A story your mind creates while you sleep.", alternatives: ["ARMED"] },
    { word: "GREEN", hint: "The color of grass and leaves.", alternatives: ["GENRE"] },
    { word: "BREAD", hint: "A baked food you might use for a sandwich.", alternatives: ["BEARD", "BARED", "DEBAR"] },
    { word: "CLOCK", hint: "Something that tells you the time." },
    { word: "BEACH", hint: "A sandy place beside the sea." },
    { word: "FRUIT", hint: "Apples, bananas, and oranges are examples." },
    { word: "HONEY", hint: "A sweet food made by bees." },
    { word: "LAUGH", hint: "The sound you make when something is funny." },
];

export function acceptedAnswers(entry: WordEntry) { return [entry.word, ...(entry.alternatives ?? [])]; }
export function shuffleLetters(entry: WordEntry, previous = "", random = Math.random) {
    const forbidden = new Set([...acceptedAnswers(entry), previous]);
    const letters = [...entry.word];
    for (let attempt = 0; attempt < 12; attempt++) {
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        const shuffled = letters.join("");
        if (!forbidden.has(shuffled)) return shuffled;
    }
    // A deterministic fallback also handles a constant random source and repeats.
    for (let i = 0; i < letters.length; i++) for (let j = i + 1; j < letters.length; j++) {
        const candidate = [...letters];
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        if (!forbidden.has(candidate.join(""))) return candidate.join("");
    }
    return letters.join("");
}

export type WordPhase = "ready" | "running" | "paused" | "answered" | "finished";
export type WordGame = {
    phase: WordPhase; deck: (WordEntry & { scrambled: string })[]; index: number;
    letters: string; answer: string; score: number; solved: number;
    remainingMs: number; deadline: number | null; hintVisible: boolean;
    result: "correct" | "timeout" | null; feedback: string;
};
export type WordAction =
    | { type: "start" | "tick" | "pause" | "resume" | "submit" | "hint" | "next"; now: number }
    | { type: "input"; value: string }
    | { type: "shuffle"; letters: string; now: number }
    | { type: "reset"; game: WordGame };

export function createWordGame(random = Math.random): WordGame {
    const pool = [...WORDS.slice(1)];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const deck = [WORDS[0], ...pool.slice(0, ROUND_COUNT - 1)].map((entry, index) => ({ ...entry, scrambled: index === 0 ? "DLBUI" : shuffleLetters(entry, "", random) }));
    return {
        phase: "ready", deck, index: 0, letters: deck[0].scrambled,
        answer: "", score: 0, solved: 0, remainingMs: ROUND_SECONDS * 1000,
        deadline: null, hintVisible: false, result: null, feedback: "",
    };
}

function updateClock(game: WordGame, now: number): WordGame {
    if (game.phase !== "running" || game.deadline === null) return game;
    const remainingMs = Math.max(0, game.deadline - now);
    if (remainingMs === 0) return { ...game, remainingMs, phase: "answered", result: "timeout", deadline: null, feedback: `Time's up. The word was ${game.deck[game.index].word}.` };
    return { ...game, remainingMs };
}

export function wordReducer(game: WordGame, action: WordAction): WordGame {
    if (action.type === "reset") return action.game;
    if (action.type === "input") return game.phase === "running" ? { ...game, answer: action.value.replace(/[^a-z]/gi, "").slice(0, game.letters.length), feedback: "" } : game;
    if (action.type === "start") return game.phase === "ready" ? { ...game, phase: "running", deadline: action.now + game.remainingMs } : game;
    if (action.type === "resume") return game.phase === "paused" ? { ...game, phase: "running", deadline: action.now + game.remainingMs } : game;
    if (action.type === "next") {
        if (game.phase !== "answered") return game;
        if (game.index === ROUND_COUNT - 1) return { ...game, phase: "finished" };
        const index = game.index + 1;
        return { ...game, phase: "running", index, letters: game.deck[index].scrambled, answer: "", remainingMs: ROUND_SECONDS * 1000, deadline: action.now + ROUND_SECONDS * 1000, result: null, hintVisible: false, feedback: "" };
    }
    const current = updateClock(game, action.now);
    if (current.phase !== "running") return current;
    if (action.type === "tick") return current;
    if (action.type === "pause") return { ...current, phase: "paused", deadline: null };
    if (action.type === "hint") return { ...current, hintVisible: true };
    if (action.type === "shuffle") return { ...current, letters: action.letters };
    if (!current.answer.trim()) return { ...current, feedback: "Type your answer first." };
    if (!acceptedAnswers(current.deck[current.index]).includes(current.answer.trim().toUpperCase())) return { ...current, feedback: "Not quite. Give those letters another try." };
    return { ...current, phase: "answered", result: "correct", score: current.score + 20, solved: current.solved + 1, deadline: null, feedback: "Correct! +20 points." };
}
