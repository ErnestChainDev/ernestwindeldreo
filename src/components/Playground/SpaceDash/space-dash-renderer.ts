import { WORLD_HEIGHT, type Asteroid, type Flight } from "./space-dash-model";

const stars = Array.from({ length: 48 }, (_, index) => ({
    x: ((index * 197 + 71) % 1600) / 1600,
    y: 65 + ((index * 113 + 97) % 440),
    cross: index % 5 === 0,
    size: index % 3 === 0 ? 3 : 2,
}));

function rock(context: CanvasRenderingContext2D, asteroid: Asteroid, moving: boolean) {
    const { x, y, radius, variant } = asteroid;
    context.save();
    context.translate(Math.round(x - radius), Math.round(y - radius));
    context.scale(radius / 24, radius / 24);
    if (moving) {
        context.fillStyle = "#a6a6aa";
        for (let row = 0; row < 3; row++) {
            for (let column = 0; column < 4; column++) context.fillRect(-5 - column * 5 - row * 2, 15 + row * 7, 1.5, 1.5);
        }
    }
    const outline = new Path2D("M19 2h12v3h5v4h4v5h4v6h2v13h-3v6h-5v4h-6v4H20v-3h-6v-4H9v-5H5v-8H3v-8h4v-7h5V7h7Z");
    context.fillStyle = "#a5a5a6";
    context.strokeStyle = "#0b0b0c";
    context.lineWidth = 2.5;
    context.fill(outline);
    context.stroke(outline);
    context.fillStyle = "#c4c4c5";
    context.fill(new Path2D("M19 5h10v2H18v4h-5v6H9v10H6v-7h4v-7h5V9h4Z"));
    const craters = [[16, 16, 2.3], [32, 23, 3.7], [13, 29, 3.2], [26, 38, 2.1]];
    for (const [cx, cy, size] of craters) {
        const px = variant === 2 ? 46 - cx : cx;
        context.fillStyle = "#555557";
        context.strokeStyle = "#19191a";
        context.lineWidth = 1.2;
        const crater = new Path2D(`M${px - size + 1} ${cy - size}h${size * 2 - 2}v1h1v${size * 2 - 2}h-1v1h${2 - size * 2}v-1h-1v${2 - size * 2}h1Z`);
        context.fill(crater);
        context.stroke(crater);
    }
    context.restore();
}

function ship(context: CanvasRenderingContext2D, flight: Flight, reducedMotion: boolean) {
    context.save();
    context.translate(Math.round(flight.width * .21), Math.round(flight.shipY));
    context.fillStyle = flight.phase === "over" ? "#85858a" : "#101011";
    const flicker = reducedMotion ? 0 : Math.floor(flight.elapsed * 12) % 3;
    const columns = flight.boosting ? 7 : 3;
    for (let row = -1; row <= 1; row++) {
        for (let column = 0; column < columns; column++) {
            if ((column + row + flicker) % 4 === 0) continue;
            context.globalAlpha = 1 - column / (columns + 1);
            context.fillRect(-45 - column * 11 - Math.abs(row) * 5, row * 11 - 2, 5, 5);
        }
    }
    context.globalAlpha = 1;
    context.strokeStyle = "#0a0a0b";
    context.lineWidth = 5;
    context.fillStyle = "#979799";
    context.fillRect(-32, -19, 15, 38);
    context.strokeRect(-32, -19, 15, 38);
    const body = new Path2D("M-18-32h12v6H4v6h11v8h17v6h7V6h-7v6H15v8H4v6H-6v6h-12Z");
    context.fillStyle = "#fafafa";
    context.fill(body);
    context.stroke(body);
    context.fillStyle = "#0a0a0b";
    context.fillRect(15, -4, 6, 7);
    context.restore();
}

export function drawFlight(context: CanvasRenderingContext2D, flight: Flight, width: number, height: number, pixelRatio: number, reducedMotion: boolean) {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.scale(width / flight.width, height / WORLD_HEIGHT);
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#151517";
    for (const star of stars) {
        const offset = reducedMotion ? 0 : flight.distance * (star.cross ? 1.1 : .55);
        const x = ((star.x * flight.width - offset) % flight.width + flight.width) % flight.width;
        if (star.cross) {
            context.fillRect(Math.round(x) - 6, star.y - 1.5, 13, 3);
            context.fillRect(Math.round(x) - 1.5, star.y - 6, 3, 13);
        } else context.fillRect(Math.round(x), star.y, star.size, star.size);
    }
    for (const asteroid of flight.asteroids) rock(context, asteroid, !reducedMotion && flight.phase === "running");
    ship(context, flight, reducedMotion);
}
