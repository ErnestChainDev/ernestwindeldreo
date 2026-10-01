export const GRID_SIZE = 18;
export type Direction = "up" | "down" | "left" | "right";
export type Cell = { x: number; y: number };
export type SnakePhase = "ready" | "running" | "paused" | "over" | "won";
export type SnakeGame = {
    phase: SnakePhase;
    body: Cell[];
    direction: Direction;
    turns: Direction[];
    food: Cell | null;
    score: number;
    event: "eat" | "crash" | "win" | null;
    steps: number;
};
const vectors: Record<Direction, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const opposite: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

export function placeFood(body: Cell[], random = Math.random): Cell | null {
    const occupied = new Set(body.map(cell => cell.y * GRID_SIZE + cell.x));
    const available: Cell[] = [];
    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        if (!occupied.has(y * GRID_SIZE + x)) available.push({ x, y });
    }
    return available[Math.min(available.length - 1, Math.floor(random() * available.length))] ?? null;
}
export function createSnake(): SnakeGame {
    return {
        phase: "ready", direction: "right", turns: [], score: 0, steps: 0, event: null,
        body: [[12, 7], [11, 7], [10, 7], [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [8, 11], [7, 11], [7, 10], [7, 9], [6, 9], [5, 9], [4, 9]].map(([x, y]) => ({ x, y })),
        food: { x: 15, y: 7 },
    };
}
export function startSnake(): SnakeGame {
    return { ...createSnake(), phase: "running", body: [7, 6, 5, 4, 3].map(x => ({ x, y: 9 })), food: { x: 12, y: 9 } };
}
export function queueTurn(game: SnakeGame, direction: Direction): SnakeGame {
    if (game.phase !== "running" || game.turns.length >= 2) return game;
    const previous = game.turns.at(-1) ?? game.direction;
    if (direction === previous || direction === opposite[previous]) return game;
    return { ...game, turns: [...game.turns, direction] };
}
export function stepSnake(game: SnakeGame, random = Math.random): SnakeGame {
    if (game.phase !== "running") return game;
    const direction = game.turns[0] ?? game.direction;
    const offset = vectors[direction];
    const head = { x: game.body[0].x + offset.x, y: game.body[0].y + offset.y };
    const eating = game.food !== null && sameCell(head, game.food);
    // The tail moves away on a normal step, so its old cell is safe to enter.
    const collidable = eating ? game.body : game.body.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= GRID_SIZE || head.y >= GRID_SIZE || collidable.some(cell => sameCell(cell, head))) {
        return { ...game, phase: "over", turns: [], event: "crash", steps: game.steps + 1 };
    }
    const body = [head, ...game.body];
    if (!eating) body.pop();
    const food = eating ? placeFood(body, random) : game.food;
    return { ...game, body, food, direction, turns: game.turns.slice(1), score: game.score + (eating ? 10 : 0),
        phase: food ? "running" : "won", event: !food ? "win" : eating ? "eat" : null, steps: game.steps + 1 };
}
export function moveInterval(score: number) { return Math.max(90, 190 - Math.floor(score / 10) * 4); }
export type SnakeAction = { type: "start" | "pause" | "resume" } | { type: "turn"; direction: Direction } | { type: "tick"; random?: () => number };
export function snakeReducer(game: SnakeGame, action: SnakeAction): SnakeGame {
    switch (action.type) {
        case "start": return startSnake();
        case "turn": return queueTurn(game, action.direction);
        case "tick": return stepSnake(game, action.random);
        case "pause": return game.phase === "running" ? { ...game, phase: "paused", turns: [], event: null } : game;
        case "resume": return game.phase === "paused" ? { ...game, phase: "running", event: null } : game;
    }
}
