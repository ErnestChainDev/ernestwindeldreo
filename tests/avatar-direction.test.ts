import assert from "node:assert/strict";
import { test } from "node:test";
import { avatarDirection } from "../src/lib/avatar-direction.ts";

test("the portrait looks toward the cursor in all eight screen directions", () => {
    const positions = [
        [100, 0, "right"], [100, 100, "bottom-right"], [0, 100, "down"],
        [-100, 100, "bottom-left"], [-100, 0, "left"], [-100, -100, "top-left"],
        [0, -100, "up"], [100, -100, "top-right"],
    ] as const;
    for (const [x, y, direction] of positions) assert.equal(avatarDirection(x, y, 20), direction);
});

test("the portrait faces forward inside its central dead zone", () => {
    for (const [x, y] of [[0, 0], [12, 12], [-12, -12], [20, 0]]) {
        assert.equal(avatarDirection(x, y, 20), "front");
    }
});

test("a small vertical movement keeps a horizontal gaze instead of switching diagonally", () => {
    assert.equal(avatarDirection(100, 20, 20), "right");
    assert.equal(avatarDirection(-100, -20, 20), "left");
    assert.equal(avatarDirection(20, -100, 20), "up");
});
