import test from "node:test";
import assert from "node:assert/strict";
import { createFlight, emptyInput, flightScore, hitsShip, resizeFlight, startFlight, stepFlight, WORLD_HEIGHT } from "../src/components/Playground/SpaceDash/space-dash-model.ts";

test("ready, paused, and finished games do not move or gain points", () => {
    for (const phase of ["ready", "paused", "over"] as const) {
        const flight = createFlight();
        flight.phase = phase;
        const before = structuredClone(flight);
        stepFlight(flight, { ...emptyInput(), down: true, boost: true }, 1);
        assert.deepEqual(flight, before);
    }
});

test("movement stays inside the board and pointer steering cannot teleport", () => {
    const flight = startFlight(900);
    flight.asteroids = [];
    flight.spawnIn = 100;
    const input = { ...emptyInput(), up: true };
    for (let i = 0; i < 120; i++) stepFlight(flight, input, 1 / 60);
    assert.equal(flight.shipY, 92);
    input.up = false;
    input.down = true;
    for (let i = 0; i < 120; i++) stepFlight(flight, input, 1 / 60);
    assert.equal(flight.shipY, WORLD_HEIGHT - 38);
    input.down = false;
    input.targetY = -100;
    const previous = flight.shipY;
    stepFlight(flight, input, 1 / 60);
    assert.equal(previous - flight.shipY, 315 / 60);
});

test("boost increases distance, depletes fuel, and needs release after exhaustion", () => {
    const normal = startFlight(1200);
    const boosted = startFlight(1200);
    for (const flight of [normal, boosted]) { flight.asteroids = []; flight.spawnIn = 100; }
    const held = { ...emptyInput(), boost: true };
    for (let i = 0; i < 60; i++) {
        stepFlight(normal, emptyInput(), 1 / 60);
        stepFlight(boosted, held, 1 / 60);
    }
    assert.ok(boosted.distance > normal.distance * 1.6);
    assert.ok(boosted.fuel < 65);
    for (let i = 0; i < 150; i++) stepFlight(boosted, held, 1 / 60);
    assert.equal(boosted.boostLocked, true);
    assert.equal(boosted.boosting, false);
    stepFlight(boosted, emptyInput(), 1 / 60);
    stepFlight(boosted, held, 1 / 60);
    assert.equal(boosted.boosting, true);
    for (let i = 0; i < 600; i++) stepFlight(boosted, emptyInput(), 1 / 60);
    assert.equal(boosted.fuel, 100);
});

test("collision ends the flight and freezes the final score; near misses stay playable", () => {
    const flight = startFlight();
    const rock = { id: 10, x: flight.width * .21, y: flight.shipY + 100, radius: 40, variant: 0 };
    assert.equal(hitsShip(flight, rock), false);
    rock.y = flight.shipY;
    assert.equal(hitsShip(flight, rock), true);
    flight.asteroids = [rock];
    stepFlight(flight, emptyInput(), 1 / 60);
    assert.equal(flight.phase, "over");
    const score = flightScore(flight);
    stepFlight(flight, { ...emptyInput(), boost: true }, 1);
    assert.equal(flightScore(flight), score);
    const restarted = startFlight(flight.width);
    assert.equal(restarted.phase, "running");
    assert.equal(restarted.distance, 0);
    assert.equal(restarted.fuel, 100);
});

test("narrow screens get a safe start and resizing preserves relative obstacle positions", () => {
    const flight = startFlight(400);
    assert.ok(flight.asteroids.every(asteroid => asteroid.x > flight.width));
    const positions = flight.asteroids.map(asteroid => asteroid.x / flight.width);
    resizeFlight(flight, 1600);
    assert.deepEqual(flight.asteroids.map(asteroid => asteroid.x / flight.width), positions);
    assert.equal(flight.shipY, 270);
});

test("spawning leaves a navigable gap and long frames cannot jump through an asteroid", () => {
    const flight = startFlight(800);
    flight.spawnIn = 0;
    const lastX = Math.max(...flight.asteroids.map(asteroid => asteroid.x));
    stepFlight(flight, emptyInput(), 10, () => .5);
    assert.equal(flight.elapsed, .05);
    const next = flight.asteroids.at(-1)!;
    assert.ok(next.x > lastX + 240);
    assert.ok(next.y - next.radius >= 100);
    assert.ok(next.y + next.radius <= WORLD_HEIGHT - 40);
});

test("simulation produces the same distance and movement at 30 and 120 frames per second", () => {
    const slow = startFlight();
    const fast = startFlight();
    for (const flight of [slow, fast]) { flight.asteroids = []; flight.spawnIn = 100; }
    const input = { ...emptyInput(), up: true };
    for (let i = 0; i < 30; i++) stepFlight(slow, input, 1 / 30);
    for (let i = 0; i < 120; i++) stepFlight(fast, input, 1 / 120);
    assert.ok(Math.abs(slow.distance - fast.distance) < .01);
    assert.equal(slow.shipY, fast.shipY);
});
