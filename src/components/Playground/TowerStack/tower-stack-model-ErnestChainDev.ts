export const BLOCK_HEIGHT = 36;
export const BASE_Y = 480;
export const WORLD_HEIGHT = 540;
export type TowerPhase = "ready" | "running" | "paused" | "over";
export type Block = { x: number; y: number; width: number; dark: boolean };
export type MovingBlock = Block & { direction: number; falling: boolean; velocity: number };
export type Fragment = Block & { vx: number; vy: number; angle: number; spin: number };
export type Placement = "land" | "perfect" | "miss";
export type TowerGame = {
    phase: TowerPhase;
    baseWidth: number;
    trackHalf: number;
    blocks: Block[];
    moving: MovingBlock | null;
    fragments: Fragment[];
    score: number;
    streak: number;
    camera: number;
    cooldown: number;
    feedback: string;
    feedbackTime: number;
};

function dimensions(visibleWidth: number) {
    return { baseWidth: Math.min(310, visibleWidth * .48), trackHalf: Math.min(360, visibleWidth * .46) };
}

export function createTower(visibleWidth = 1600): TowerGame {
    const size = dimensions(visibleWidth);
    return {
        phase: "ready", ...size,
        blocks: [{ x: -size.baseWidth / 2, y: BASE_Y, width: size.baseWidth, dark: false }],
        moving: null, fragments: [], score: 0, streak: 0, camera: 0,
        cooldown: 0, feedback: "", feedbackTime: 0,
    };
}

function nextBlock(game: TowerGame): MovingBlock {
    const top = game.blocks.at(-1)!;
    const fromLeft = game.score % 2 === 0;
    return {
        x: fromLeft ? -game.trackHalf : game.trackHalf - top.width,
        y: top.y - BLOCK_HEIGHT - 66, width: top.width,
        dark: !top.dark, direction: fromLeft ? 1 : -1, falling: false, velocity: 0,
    };
}

export function startTower(visibleWidth: number) {
    const game = createTower(visibleWidth);
    game.phase = "running";
    game.moving = nextBlock(game);
    return game;
}

export function resizeTower(game: TowerGame, visibleWidth: number) {
    const size = dimensions(visibleWidth);
    const ratio = size.baseWidth / game.baseWidth;
    for (const block of [...game.blocks, ...game.fragments, ...(game.moving ? [game.moving] : [])]) {
        block.x *= ratio;
        block.width *= ratio;
    }
    game.baseWidth = size.baseWidth;
    game.trackHalf = size.trackHalf;
    if (game.moving && !game.moving.falling) game.moving.x = Math.max(-size.trackHalf, Math.min(size.trackHalf - game.moving.width, game.moving.x));
}

export function dropBlock(game: TowerGame) {
    if (game.phase !== "running" || !game.moving || game.moving.falling || game.cooldown > 0) return false;
    game.moving.falling = true;
    game.moving.velocity = 150;
    return true;
}

function fragment(game: TowerGame, block: Block, direction: number) {
    game.fragments.push({ ...block, vx: direction * 65, vy: 30, angle: 0, spin: direction * 2.4 });
}

function landBlock(game: TowerGame): Placement {
    const block = game.moving!;
    const top = game.blocks.at(-1)!;
    const tolerance = 4 * game.baseWidth / 310;
    const perfect = Math.abs(block.x - top.x) <= tolerance;
    const left = Math.max(block.x, top.x);
    const right = Math.min(block.x + block.width, top.x + top.width);
    const overlap = right - left;
    if (!perfect && overlap < 4 * game.baseWidth / 310) {
        fragment(game, block, block.x < top.x ? -1 : 1);
        game.moving = null;
        game.phase = "over";
        game.feedback = "";
        return "miss";
    }
    const placed = { x: perfect ? top.x : left, y: top.y - BLOCK_HEIGHT, width: perfect ? top.width : overlap, dark: block.dark };
    if (!perfect) {
        if (block.x < left) fragment(game, { ...block, width: left - block.x }, -1);
        if (block.x + block.width > right) fragment(game, { ...block, x: right, width: block.x + block.width - right }, 1);
    }
    game.blocks.push(placed);
    if (game.blocks.length > 24) game.blocks.shift();
    game.score++;
    game.streak = perfect ? game.streak + 1 : 0;
    game.feedback = perfect ? (game.streak > 1 ? `Perfect × ${game.streak}` : "Perfect.") : "";
    game.feedbackTime = .7;
    game.cooldown = .2;
    game.moving = null;
    return perfect ? "perfect" : "land";
}

// Animation state stays outside React. A placement event updates the score and sound.
export function stepTower(game: TowerGame, seconds: number): Placement | null {
    if ((game.phase !== "running" && game.phase !== "over") || seconds <= 0) return null;
    const dt = Math.min(seconds, .05);
    for (const piece of game.fragments) {
        piece.vy += 1250 * dt;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.angle += piece.spin * dt;
    }
    game.fragments = game.fragments.filter(piece => piece.y + game.camera < WORLD_HEIGHT + 100);
    if (game.phase === "over") return null;
    const cameraTarget = Math.max(0, (game.score - 9) * BLOCK_HEIGHT);
    game.camera += (cameraTarget - game.camera) * (1 - Math.exp(-10 * dt));
    game.feedbackTime = Math.max(0, game.feedbackTime - dt);
    if (game.cooldown > 0) {
        game.cooldown = Math.max(0, game.cooldown - dt);
        if (game.cooldown === 0) game.moving = nextBlock(game);
        return null;
    }
    const block = game.moving;
    if (!block) return null;
    if (block.falling) {
        block.velocity += 2200 * dt;
        block.y += block.velocity * dt;
        const landingY = game.blocks.at(-1)!.y - BLOCK_HEIGHT;
        if (block.y >= landingY) { block.y = landingY; return landBlock(game); }
    } else {
        const speed = Math.min(340, 150 + game.score * 7) * game.baseWidth / 310;
        block.x += block.direction * speed * dt;
        const left = -game.trackHalf;
        const right = game.trackHalf - block.width;
        // Reflect overshoot so the travel speed is consistent across frame rates.
        if (block.x > right) { block.x = right - (block.x - right); block.direction = -1; }
        else if (block.x < left) { block.x = left + (left - block.x); block.direction = 1; }
    }
    return null;
}
