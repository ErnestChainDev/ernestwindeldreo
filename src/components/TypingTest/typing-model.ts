export type TestMode = "time" | "words";
export type TestLanguage = "english" | "filipino";
export type TestSettings = { mode: TestMode; limit: number; language: TestLanguage };
export type TestSession = {
    settings: TestSettings;
    seed: number;
    text: string;
    typed: string;
    startedAt: number | null;
    finishedAt: number | null;
    now: number;
    attempts: number;
    correctAttempts: number;
};
export type TestAction =
    | { type: "input"; value: string; now: number }
    | { type: "tick"; now: number }
    | { type: "reset"; settings?: TestSettings };

const passages: Record<TestLanguage, string[]> = {
    english: [
        "every small step brings a new chance to learn and create take your time and let each idea become something useful the best way to grow is to keep showing up every day",
        "a quiet morning gives the mind a little room to think good ideas often start with a simple question and the courage to try something new",
        "build things that help people learn from the work you share listen with care and remember that steady progress matters more than a perfect beginning",
        "find your rhythm and follow the words one at a time let your hands move with care and give yourself the space to improve with practice",
        "the world is full of stories waiting to be told look closely at the small details and you may discover a different way to see familiar things",
        "work with purpose stay curious and make time to rest a little patience can turn a difficult problem into a useful lesson for the next day",
    ],
    filipino: [
        "bawat maliit na hakbang ay isang bagong pagkakataon upang matuto at lumikha maglaan ng oras sa bawat ideya at gawing kapaki pakinabang ang iyong ginagawa",
        "sa tahimik na umaga may panahon upang mag isip ang magagandang ideya ay nagsisimula sa simpleng tanong at lakas ng loob na sumubok ng bago",
        "gumawa ng mga bagay na makatutulong sa iba makinig nang mabuti at tandaan na ang patuloy na pagsisikap ay mahalaga sa bawat paglalakbay",
        "hanapin ang iyong ritmo at sundan ang bawat salita ang kaunting pagsasanay sa araw araw ay makatutulong upang maging mas mahusay sa iyong ginagawa",
        "maraming kuwento ang naghihintay na maibahagi tumingin sa maliliit na detalye at makakahanap ka ng bagong paraan upang maunawaan ang mga bagay sa paligid",
    ],
};

function makePassage(language: TestLanguage, count: number, seed: number) {
    const source = passages[language];
    const words: string[] = [];
    for (let index = seed; words.length < count; index++) words.push(...source[index % source.length].split(" "));
    return words.slice(0, count).join(" ");
}

export function createSession(settings: TestSettings = { mode: "time", limit: 30, language: "english" }, seed = 0): TestSession {
    return {
        settings, seed, text: makePassage(settings.language, settings.mode === "words" ? settings.limit : 300, seed),
        typed: "", startedAt: null, finishedAt: null, now: 0, attempts: 0, correctAttempts: 0,
    };
}

export function testReducer(state: TestSession, action: TestAction): TestSession {
    if (action.type === "reset") return createSession(action.settings ?? state.settings, state.seed + 1);
    if (state.finishedAt !== null) return state;
    if (state.startedAt !== null && state.settings.mode === "time") {
        const deadline = state.startedAt + state.settings.limit * 1000;
        // An input arriving after the deadline cannot add to the final score.
        if (action.now >= deadline) return { ...state, now: deadline, finishedAt: deadline };
    }
    if (action.type === "tick") return state.startedAt === null ? state : { ...state, now: action.now };
    const value = action.value.replace(/[\r\n]/g, " ").slice(0, state.text.length);
    if (value === state.typed) return state;
    let prefix = 0;
    while (prefix < value.length && prefix < state.typed.length && value[prefix] === state.typed[prefix]) prefix++;
    let suffix = 0;
    while (suffix < value.length - prefix && suffix < state.typed.length - prefix
        && value[value.length - 1 - suffix] === state.typed[state.typed.length - 1 - suffix]) suffix++;
    const inserted = value.slice(prefix, value.length - suffix);
    const correct = [...inserted].filter((character, index) => character === state.text[prefix + index]).length;
    const finished = state.settings.mode === "words" && value.length === state.text.length;
    const extended = state.settings.mode === "time" && state.text.length - value.length < 100;
    return {
        ...state, typed: value, now: action.now, startedAt: state.startedAt ?? action.now,
        finishedAt: finished ? action.now : null,
        attempts: state.attempts + inserted.length, correctAttempts: state.correctAttempts + correct,
        text: extended ? `${state.text} ${makePassage(state.settings.language, 200, state.seed + 1)}` : state.text,
    };
}

export function getStats(state: TestSession) {
    const elapsed = state.startedAt === null ? 0 : Math.max(0, ((state.finishedAt ?? state.now) - state.startedAt) / 1000);
    const correctCharacters = [...state.typed].filter((character, index) => character === state.text[index]).length;
    return {
        wpm: elapsed > 0 ? Math.round((correctCharacters / 5) / (Math.max(1, elapsed) / 60)) : 0,
        accuracy: state.attempts ? Math.round(state.correctAttempts / state.attempts * 100) : 100,
        remaining: Math.max(0, Math.ceil(state.settings.limit - elapsed)),
        words: Math.min(state.settings.limit, state.typed.split(" ").length - 1 + Number(state.finishedAt !== null && state.settings.mode === "words")),
    };
}
