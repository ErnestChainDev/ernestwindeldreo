import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, getStats, testReducer } from '../src/components/TypingTest/typing-model.ts';

test('waits for input and resets the timer, score, and passage', () => {
    const ready = createSession();
    assert.match(ready.text, /^every small step brings a new chance/);
    assert.equal(testReducer(ready, { type: 'tick', now: 9000 }), ready);
    const running = testReducer(ready, { type: 'input', value: 'every', now: 10000 });
    assert.equal(running.startedAt, 10000);
    const reset = testReducer(running, { type: 'reset' });
    assert.equal(reset.startedAt, null);
    assert.equal(reset.typed, '');
    assert.equal(reset.attempts, 0);
    assert.notEqual(reset.text, ready.text);
    assert.equal(getStats(reset).remaining, 30);
});

test('expires at the absolute deadline and excludes late input', () => {
    const ready = createSession({ mode: 'time', limit: 15, language: 'english' });
    const running = testReducer(ready, { type: 'input', value: 'e', now: 1000 });
    const before = testReducer(running, { type: 'tick', now: 15999 });
    assert.equal(getStats(before).remaining, 1);
    const done = testReducer(before, { type: 'input', value: 'every', now: 16001 });
    assert.equal(done.finishedAt, 16000);
    assert.equal(done.typed, 'e');
    assert.equal(getStats(done).remaining, 0);
    assert.equal(testReducer(done, { type: 'tick', now: 30000 }), done);
});

test('backspace fixes the passage without erasing earlier mistakes from accuracy', () => {
    let state = testReducer(createSession(), { type: 'input', value: 'x', now: 1000 });
    state = testReducer(state, { type: 'input', value: '', now: 1100 });
    assert.equal(state.attempts, 1);
    state = testReducer(state, { type: 'input', value: 'e', now: 1500 });
    state = testReducer(state, { type: 'input', value: 'ev', now: 2000 });
    assert.equal(state.attempts, 3);
    assert.equal(state.correctAttempts, 2);
    assert.equal(getStats(state).accuracy, 67);
});

test('calculates WPM from correct characters and elapsed time', () => {
    const ready = createSession();
    let state = testReducer(ready, { type: 'input', value: ready.text.slice(0, 30), now: 1000 });
    state = testReducer(state, { type: 'tick', now: 7000 });
    assert.equal(getStats(state).wpm, 60);
    assert.equal(getStats(state).accuracy, 100);
});

test('word mode ends at the target and keeps the final score stable', () => {
    const ready = createSession({ mode: 'words', limit: 10, language: 'english' });
    assert.equal(ready.text.split(' ').length, 10);
    let state = testReducer(ready, { type: 'input', value: 'every ', now: 1000 });
    assert.equal(getStats(state).words, 1);
    state = testReducer(state, { type: 'input', value: ready.text, now: 7000 });
    assert.equal(state.finishedAt, 7000);
    assert.equal(getStats(state).words, 10);
    assert.equal(testReducer(state, { type: 'input', value: '', now: 8000 }), state);
});

test('time mode replenishes the passage for fast typists', () => {
    const ready = createSession({ mode: 'time', limit: 120, language: 'english' });
    const state = testReducer(ready, { type: 'input', value: ready.text, now: 1000 });
    assert.equal(state.finishedAt, null);
    assert.ok(state.text.length > ready.text.length);
    assert.ok(state.text.startsWith(`${ready.text} `));
});

test('changing settings creates a fresh passage in the selected language', () => {
    const next = testReducer(createSession(), { type: 'reset', settings: { mode: 'words', limit: 25, language: 'filipino' } });
    assert.equal(next.text.split(' ').length, 25);
    assert.match(next.text, /umaga|ideya|tanong/);
    assert.equal(next.startedAt, null);
    assert.equal(next.finishedAt, null);
});
