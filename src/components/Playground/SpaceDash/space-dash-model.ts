export const WORLD_HEIGHT = 540;
export const SHIP_HALF_WIDTH = 29;
export const SHIP_HALF_HEIGHT = 21;

export type FlightPhase = "ready" | "running" | "paused" | "over";
export type FlightInput = { up: boolean; down: boolean; boost: boolean; targetY: number | null };
export type Asteroid = { id: number; x: number; y: number; radius: number; variant: number };
export type Flight = {
    phase: FlightPhase;
    width: number;
    shipY: number;
    asteroids: Asteroid[];
    distance: number;
    elapsed: number;
    fuel: number;
    boosting: boolean;
    boostLocked: boolean;
    spawnIn: number;
    nextId: number;
};

export function emptyInput(): FlightInput {
    return { up: false, down: false, boost: false, targetY: null };
}

export function createFlight(width = 1600): Flight {
    return {
        phase: "ready", width, shipY: 270, distance: 0, elapsed: 0,
        fuel: 100, boosting: false, boostLocked: false, spawnIn: 2.4, nextId: 4,
        asteroids: [
            { id: 0, x: width * .43, y: 150, radius: 54, variant: 0 },
            { id: 1, x: width * .71, y: 200, radius: 36, variant: 1 },
            { id: 2, x: width * .89, y: 385, radius: 65, variant: 2 },
            { id: 3, x: width * .33, y: 425, radius: 31, variant: 1 },
        ],
    };
}

export function startFlight(width: number): Flight {
    const flight = createFlight(width);
    flight.phase = "running";
    // Leave time to react on narrow screens, where the ship sees less of space.
    if (width < 900) flight.asteroids.forEach((asteroid, index) => { asteroid.x = width + 100 + index * 270; });
    return flight;
}

export function flightScore(flight: Flight) {
    return Math.floor(flight.distance * 2);
}

export function hitsShip(flight: Flight, asteroid: Asteroid) {
    const shipX = flight.width * .21;
    const closestX = Math.max(shipX - SHIP_HALF_WIDTH, Math.min(asteroid.x, shipX + SHIP_HALF_WIDTH));
    const closestY = Math.max(flight.shipY - SHIP_HALF_HEIGHT, Math.min(asteroid.y, flight.shipY + SHIP_HALF_HEIGHT));
    // A slightly forgiving hitbox follows the rock's inset pixel outline.
    return (asteroid.x - closestX) ** 2 + (asteroid.y - closestY) ** 2 < (asteroid.radius * .86) ** 2;
}

export function resizeFlight(flight: Flight, width: number) {
    const ratio = width / flight.width;
    flight.asteroids.forEach(asteroid => { asteroid.x *= ratio; });
    flight.width = width;
}

// The animation loop owns this mutable state; React only receives HUD snapshots.
export function stepFlight(flight: Flight, input: FlightInput, seconds: number, random = Math.random): FlightPhase {
    if (flight.phase !== "running" || seconds <= 0) return flight.phase;
    const dt = Math.min(seconds, .05);
    flight.elapsed += dt;

    const direction = Number(input.down) - Number(input.up);
    const movement = 315 * dt;
    if (direction) flight.shipY += direction * movement;
    else if (input.targetY !== null) flight.shipY += Math.max(-movement, Math.min(movement, input.targetY - flight.shipY));
    flight.shipY = Math.max(92, Math.min(WORLD_HEIGHT - 38, flight.shipY));

    if (!input.boost) flight.boostLocked = false;
    flight.boosting = input.boost && !flight.boostLocked && flight.fuel > 0;
    flight.fuel = Math.max(0, Math.min(100, flight.fuel + (flight.boosting ? -36 : 18) * dt));
    if (flight.fuel === 0) flight.boostLocked = true;

    const baseSpeed = Math.min(230, Math.max(105, flight.width * .135));
    const speed = (baseSpeed + Math.min(90, flight.elapsed * 1.4)) * (flight.boosting ? 1.7 : 1);
    flight.distance += speed * dt / 12;
    flight.asteroids.forEach(asteroid => { asteroid.x -= speed * dt; });
    flight.asteroids = flight.asteroids.filter(asteroid => asteroid.x > -asteroid.radius * 2);

    flight.spawnIn -= dt * (flight.boosting ? 1.7 : 1);
    if (flight.spawnIn <= 0) {
        const radius = 28 + random() * 32;
        // Keep obstacles separated horizontally so a clear route always exists.
        const lastX = Math.max(flight.width, ...flight.asteroids.map(asteroid => asteroid.x));
        flight.asteroids.push({
            id: flight.nextId++, x: Math.max(flight.width + radius, lastX + 255),
            y: 100 + radius + random() * (WORLD_HEIGHT - 140 - radius * 2),
            radius, variant: Math.floor(random() * 3),
        });
        flight.spawnIn = Math.max(1.15, 1.8 - flight.elapsed * .003) + random() * .4;
    }

    if (flight.asteroids.some(asteroid => hitsShip(flight, asteroid))) {
        flight.phase = "over";
        flight.boosting = false;
    }
    return flight.phase;
}
