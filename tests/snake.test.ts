import test from "node:test";
import assert from "node:assert/strict";
import { createSnake, GRID_SIZE, moveInterval, placeFood, queueTurn, snakeReducer, startSnake, stepSnake, type SnakeGame } from "../src/components/Playground/Snake/snake-model.ts";

test("a fresh game starts with five cells and the first food ahead", () => {
    assert.equal(createSnake().phase, "ready");
    const game = startSnake();
    assert.equal(game.body.length, 5);
    const next = stepSnake(game);
    assert.deepEqual(next.body[0], { x: 8, y: 9 });
    assert.equal(next.body.length, 5);
    assert.equal(next.score, 0);
    assert.equal(game.body[0].x, 7);
});
test("food grows the snake, adds ten points, and respawns off the body", () => {
    let game = startSnake();
    for (let step = 0; step < 5; step++) game = stepSnake(game, () => .5);
    assert.equal(game.score, 10);
    assert.equal(game.body.length, 6);
    assert.equal(game.event, "eat");
    assert(game.food && !game.body.some(cell => cell.x === game.food!.x && cell.y === game.food!.y));
});
test("rapid turns are queued in order without allowing an instant reversal", () => {
    const initial = startSnake();
    assert.equal(queueTurn(initial, "left"), initial);
    let game = queueTurn(initial, "up");
    assert.equal(queueTurn(game, "down"), game);
    game = queueTurn(game, "left");
    assert.equal(queueTurn(game, "down"), game, "queue is bounded to two turns");
    game = stepSnake(game);
    assert.deepEqual(game.body[0], { x: 7, y: 8 });
    game = stepSnake(game);
    assert.deepEqual(game.body[0], { x: 6, y: 8 });
});
test("all four walls end the run without extending outside the board", () => {
    for (const [direction, x, y] of [["left", 0, 5], ["right", 17, 5], ["up", 5, 0], ["down", 5, 17]] as const) {
        const game: SnakeGame = { ...startSnake(), body: [{ x, y }], direction };
        const next = stepSnake(game);
        assert.equal(next.phase, "over");
        assert.equal(next.event, "crash");
        assert.deepEqual(next.body, game.body);
        assert.equal(stepSnake(next), next);
    }
});
test("hitting the body ends the run, but entering the vacated tail is legal", () => {
    const game: SnakeGame = { ...startSnake(), direction: "up", body: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 1 }, { x: 2, y: 1 }] };
    assert.equal(stepSnake(game).phase, "running");
    assert.equal(stepSnake({ ...game, body: [...game.body, { x: 1, y: 1 }] }).phase, "over");
});
test("pause freezes the game and clears buffered turns", () => {
    const initial = queueTurn(startSnake(), "up");
    const paused = snakeReducer(initial, { type: "pause" });
    assert.equal(paused.phase, "paused");
    assert.deepEqual(paused.turns, []);
    assert.equal(stepSnake(paused), paused);
    assert.equal(queueTurn(paused, "down"), paused);
    const resumed = snakeReducer(paused, { type: "resume" });
    assert.equal(resumed.phase, "running");
    assert.deepEqual(resumed.body, initial.body);
});
test("food placement finds the final free cell and handles a full board", () => {
    const body = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({ x: i % GRID_SIZE, y: Math.floor(i / GRID_SIZE) }));
    assert.equal(placeFood(body), null);
    assert.deepEqual(placeFood(body.slice(1), () => .99), { x: 0, y: 0 });
});
test("eating the last free cell wins without trying to spawn food forever", () => {
    const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({ x: i % GRID_SIZE, y: Math.floor(i / GRID_SIZE) }));
    const game: SnakeGame = { ...startSnake(), body: [cells[0], ...cells.slice(2)], food: cells[1], score: 3180 };
    const won = stepSnake(game);
    assert.equal(won.phase, "won");
    assert.equal(won.food, null);
    assert.equal(won.body.length, 324);
    assert.equal(won.score, 3190);
    assert.equal(won.event, "win");
});
test("restart resets the run and increasing speed remains bounded", () => {
    const old = { ...startSnake(), phase: "over" as const, score: 100 };
    assert.deepEqual(snakeReducer(old, { type: "start" }), startSnake());
    assert(moveInterval(50) < moveInterval(0));
    assert.equal(moveInterval(10000), 90);
});
