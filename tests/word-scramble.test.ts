import test from "node:test";
import assert from "node:assert/strict";
import { acceptedAnswers, createWordGame, ROUND_COUNT, shuffleLetters, WORDS, wordReducer } from "../src/components/Playground/WordScramble/word-scramble-model.ts";

function started() { return wordReducer(createWordGame(() => .4), { type: "start", now: 1000 }); }

test("a new game has ten distinct words and waits for Start", () => {
    const game = createWordGame();
    assert.equal(game.deck.length, ROUND_COUNT);
    assert.equal(new Set(game.deck.map(entry => entry.word)).size, ROUND_COUNT);
    assert.equal(game.letters, "DLBUI");
    assert.equal(game.remainingMs, 30000);
    assert.equal(game.phase, "ready");
    assert.equal(wordReducer(game, { type: "tick", now: 900000 }), game);
});

test("shuffles preserve repeated letters, change the order, and never reveal a valid answer", () => {
    for (const entry of WORDS) {
        let previous = entry.word;
        for (let index = 0; index < 25; index++) {
            const letters = shuffleLetters(entry, previous, () => .4);
            assert.deepEqual([...letters].sort(), [...entry.word].sort());
            assert.notEqual(letters, previous);
            assert.equal(acceptedAnswers(entry).includes(letters), false);
            previous = letters;
        }
    }
});

test("answers ignore case, score once, and require Next to advance", () => {
    let game = started();
    game = wordReducer(game, { type: "input", value: "build" });
    game = wordReducer(game, { type: "submit", now: 3000 });
    assert.equal(game.phase, "answered");
    assert.equal(game.result, "correct");
    assert.equal(game.score, 20);
    assert.equal(game.solved, 1);
    assert.equal(game.index, 0);
    assert.equal(wordReducer(game, { type: "submit", now: 3001 }), game);
    game = wordReducer(game, { type: "next", now: 8000 });
    assert.equal(game.phase, "running");
    assert.equal(game.index, 1);
    assert.equal(game.answer, "");
    assert.equal(game.remainingMs, 30000);
    assert.equal(game.deadline, 38000);
});

test("empty and incorrect answers do not score or reset the clock", () => {
    let game = wordReducer(started(), { type: "submit", now: 2000 });
    assert.match(game.feedback, /Type your answer/);
    game = wordReducer(game, { type: "input", value: "aaaaa" });
    game = wordReducer(game, { type: "submit", now: 4000 });
    assert.equal(game.phase, "running");
    assert.equal(game.score, 0);
    assert.equal(game.deadline, 31000);
    assert.equal(game.remainingMs, 27000);
    assert.match(game.feedback, /Not quite/);
});

test("hint and shuffle keep the answer, deadline, and score", () => {
    let game = wordReducer(started(), { type: "input", value: "bu" });
    game = wordReducer(game, { type: "hint", now: 3000 });
    const letters = shuffleLetters(game.deck[0], game.letters);
    game = wordReducer(game, { type: "shuffle", letters, now: 4000 });
    assert.equal(game.hintVisible, true);
    assert.equal(game.answer, "bu");
    assert.equal(game.letters, letters);
    assert.equal(game.deadline, 31000);
    assert.equal(game.score, 0);
});

test("pausing preserves exact remaining time and resuming creates a new deadline", () => {
    let game = wordReducer(started(), { type: "pause", now: 12000 });
    assert.equal(game.remainingMs, 19000);
    assert.equal(game.phase, "paused");
    assert.equal(game.deadline, null);
    assert.equal(wordReducer(game, { type: "tick", now: 999000 }), game);
    game = wordReducer(game, { type: "resume", now: 999000 });
    assert.equal(game.deadline, 1018000);
    game = wordReducer(game, { type: "tick", now: 1000000 });
    assert.equal(game.remainingMs, 18000);
});

test("the absolute deadline rejects late submissions, hints, and pause attempts", () => {
    for (const type of ["submit", "hint", "pause", "tick"] as const) {
        let game = wordReducer(started(), { type: "input", value: "BUILD" });
        game = wordReducer(game, { type, now: 31000 });
        assert.equal(game.phase, "answered");
        assert.equal(game.result, "timeout");
        assert.equal(game.score, 0);
        assert.equal(game.remainingMs, 0);
        assert.match(game.feedback, /BUILD/);
    }
});

test("common valid anagrams are accepted", () => {
    let game = started();
    game = { ...game, deck: [{ word: "EARTH", alternatives: ["HEART"], hint: "A planet", scrambled: "HTRAE" }, ...game.deck.slice(1)], letters: "HTRAE" };
    game = wordReducer(game, { type: "input", value: "heart" });
    game = wordReducer(game, { type: "submit", now: 2000 });
    assert.equal(game.result, "correct");
});

test("all ten rounds finish at 200 points and restarting clears the session", () => {
    let game = started();
    for (let index = 0; index < ROUND_COUNT; index++) {
        const now = 2000 + index * 2000;
        game = wordReducer(game, { type: "input", value: game.deck[index].word });
        game = wordReducer(game, { type: "submit", now });
        game = wordReducer(game, { type: "next", now: now + 100 });
    }
    assert.equal(game.phase, "finished");
    assert.equal(game.score, 200);
    assert.equal(game.solved, 10);
    assert.equal(game.index, 9);
    game = wordReducer(game, { type: "reset", game: createWordGame() });
    assert.equal(game.phase, "ready");
    assert.equal(game.index, 0);
    assert.equal(game.score, 0);
});
