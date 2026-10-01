import test from "node:test";
import assert from "node:assert/strict";
import { createTower, dropBlock, resizeTower, startTower, stepTower, BLOCK_HEIGHT, type TowerGame } from "../src/components/Playground/TowerStack/tower-stack-model.ts";

function settle(game: TowerGame) {
    for (let i = 0; i < 120; i++) {
        const event = stepTower(game, 1 / 60);
        if (event) return event;
    }
    throw new Error("Block did not land");
}
function spawnNext(game: TowerGame) { for (let i = 0; i < 20 && !game.moving; i++) stepTower(game, 1 / 60); }

test("ready and paused towers stay completely frozen", () => {
    const ready = createTower();
    assert.equal(dropBlock(ready), false);
    const before = structuredClone(ready);
    stepTower(ready, .05);
    assert.deepEqual(ready, before);
    const game = startTower(1600);
    dropBlock(game);
    game.phase = "paused";
    const paused = structuredClone(game);
    stepTower(game, .05);
    assert.deepEqual(game, paused);
    assert.equal(dropBlock(game), false);
});

test("perfect placement snaps to the tower, preserves width, and counts one point", () => {
    const game = startTower(1600);
    const top = game.blocks.at(-1)!;
    game.moving!.x = top.x + 3;
    assert.equal(dropBlock(game), true);
    assert.equal(settle(game), "perfect");
    assert.equal(game.score, 1);
    assert.equal(game.streak, 1);
    assert.deepEqual(game.blocks.at(-1), { ...top, y: top.y - BLOCK_HEIGHT, dark: true });
    assert.equal(game.fragments.length, 0);
});

test("left and right overhangs trim the block and fall off on the correct side", () => {
    for (const offset of [-48, 48]) {
        const game = startTower(1600);
        const top = { ...game.blocks.at(-1)! };
        game.moving!.x = top.x + offset;
        dropBlock(game);
        assert.equal(settle(game), "land");
        const placed = game.blocks.at(-1)!;
        assert.equal(placed.width, top.width - 48);
        assert.equal(placed.x, offset < 0 ? top.x : top.x + offset);
        assert.equal(game.fragments[0].width, 48);
        assert.equal(Math.sign(game.fragments[0].vx), Math.sign(offset));
        assert.equal(game.streak, 0);
    }
});

test("missing the tower ends the game without adding a point", () => {
    const game = startTower(1600);
    game.moving!.x = game.blocks[0].x + game.blocks[0].width + 1;
    dropBlock(game);
    assert.equal(settle(game), "miss");
    assert.equal(game.phase, "over");
    assert.equal(game.score, 0);
    assert.equal(game.blocks.length, 1);
    assert.equal(dropBlock(game), false);
    for (let i = 0; i < 120; i++) stepTower(game, 1 / 60);
    assert.equal(game.score, 0);
    assert.equal(game.fragments.length, 0);
});

test("a held or rapid drop cannot create extra blocks during falling or cooldown", () => {
    const game = startTower(1600);
    game.moving!.x = game.blocks[0].x;
    assert.equal(dropBlock(game), true);
    assert.equal(dropBlock(game), false);
    settle(game);
    assert.equal(dropBlock(game), false);
    assert.equal(game.score, 1);
    spawnNext(game);
    assert.equal(game.moving!.width, game.blocks.at(-1)!.width);
    assert.equal(dropBlock(game), true);
});

test("perfect streaks reset on a partial placement and a restart resets the whole game", () => {
    let game = startTower(1600);
    for (let i = 0; i < 3; i++) {
        game.moving!.x = game.blocks.at(-1)!.x;
        dropBlock(game); settle(game); spawnNext(game);
    }
    assert.equal(game.streak, 3);
    game.moving!.x = game.blocks.at(-1)!.x + 30;
    dropBlock(game); settle(game);
    assert.equal(game.streak, 0);
    game = startTower(1600);
    assert.equal(game.score, 0);
    assert.equal(game.blocks.length, 1);
    assert.equal(game.fragments.length, 0);
    assert.equal(game.phase, "running");
});

test("high towers follow the camera without unbounded block history", () => {
    const game = startTower(1600);
    for (let i = 0; i < 40; i++) {
        game.moving!.x = game.blocks.at(-1)!.x;
        dropBlock(game); settle(game); spawnNext(game);
    }
    for (let i = 0; i < 60; i++) stepTower(game, 1 / 60);
    assert.equal(game.score, 40);
    assert.ok(game.blocks.length <= 24);
    assert.ok(Math.abs(game.camera - (40 - 9) * BLOCK_HEIGHT) < 1);
    assert.ok(game.moving!.y + game.camera > 40);
    assert.ok(game.moving!.y + game.camera < 70);
});

test("resizing preserves alignment, relative width, score, and falling progress", () => {
    const game = startTower(1600);
    game.moving!.x = game.blocks[0].x;
    dropBlock(game);
    stepTower(game, .05);
    const y = game.moving!.y;
    resizeTower(game, 360);
    assert.equal(game.moving!.x, game.blocks[0].x);
    assert.equal(game.moving!.width, game.blocks[0].width);
    assert.equal(game.moving!.y, y);
    assert.equal(settle(game), "perfect");
    assert.equal(game.score, 1);
});

test("moving blocks bounce within their track at different frame rates", () => {
    const slow = startTower(1600);
    const fast = startTower(1600);
    for (let i = 0; i < 180; i++) stepTower(slow, 1 / 30);
    for (let i = 0; i < 720; i++) stepTower(fast, 1 / 120);
    assert.ok(Math.abs(slow.moving!.x - fast.moving!.x) < .001);
    assert.equal(slow.moving!.direction, fast.moving!.direction);
    assert.ok(slow.moving!.x >= -slow.trackHalf);
    assert.ok(slow.moving!.x + slow.moving!.width <= slow.trackHalf);
});
