import { BASE_Y, BLOCK_HEIGHT, WORLD_HEIGHT, type Block, type TowerGame } from "./tower-stack-model";

function drawBlock(context: CanvasRenderingContext2D, block: Block) {
    const gradient = context.createLinearGradient(block.x, block.y, block.x + block.width, block.y + BLOCK_HEIGHT);
    gradient.addColorStop(0, block.dark ? "#565657" : "#c4c4c5");
    gradient.addColorStop(1, block.dark ? "#424243" : "#adadaf");
    context.fillStyle = gradient;
    context.strokeStyle = "#111113";
    context.lineWidth = 1.8;
    context.fillRect(block.x, block.y, block.width, BLOCK_HEIGHT);
    context.strokeRect(block.x, block.y, block.width, BLOCK_HEIGHT);
    if (block.width > 8) {
        context.strokeStyle = block.dark ? "#ffffff15" : "#ffffff55";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(block.x + 2, block.y + BLOCK_HEIGHT - 2);
        context.lineTo(block.x + 2, block.y + 2);
        context.lineTo(block.x + block.width - 2, block.y + 2);
        context.stroke();
    }
}

function arrows(context: CanvasRenderingContext2D, block: Block) {
    const y = block.y + BLOCK_HEIGHT / 2;
    context.save();
    context.strokeStyle = "#919197";
    context.lineWidth = 2;
    context.setLineDash([3, 6]);
    context.beginPath();
    context.moveTo(block.x - 60, y);
    context.lineTo(block.x - 10, y);
    context.moveTo(block.x + block.width + 10, y);
    context.lineTo(block.x + block.width + 60, y);
    context.stroke();
    context.setLineDash([]);
    context.strokeStyle = "#171719";
    context.lineWidth = 3;
    for (const [x, direction] of [[block.x - 66, -1], [block.x + block.width + 66, 1]]) {
        context.beginPath();
        context.moveTo(x - direction * 5, y - 5);
        context.lineTo(x, y);
        context.lineTo(x - direction * 5, y + 5);
        context.stroke();
    }
    context.restore();
}

export function drawTower(context: CanvasRenderingContext2D, game: TowerGame, width: number, height: number, pixelRatio: number, reducedMotion: boolean) {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    const scale = height / WORLD_HEIGHT;
    context.translate(width / 2, 0);
    context.scale(scale, scale);
    context.translate(0, game.camera);
    if (game.phase === "ready") {
        const ratio = game.baseWidth / 310;
        [310, 264, 255, 212, 190, 180, 140, 139, 113, 79, 69].forEach((blockWidth, index) => {
            drawBlock(context, { x: (-blockWidth / 2 + (index % 3 - 1) * 4) * ratio, y: BASE_Y - index * BLOCK_HEIGHT, width: blockWidth * ratio, dark: index % 2 === 1 });
        });
        const preview = { x: -47 * ratio, y: 48, width: 94 * ratio, dark: true };
        drawBlock(context, preview);
        arrows(context, preview);
    } else {
        for (const block of game.blocks) {
            if (block.y + game.camera > WORLD_HEIGHT + BLOCK_HEIGHT) continue;
            drawBlock(context, block);
        }
        if (game.moving) {
            drawBlock(context, game.moving);
            if (!game.moving.falling) arrows(context, game.moving);
        }
        if (!reducedMotion) for (const piece of game.fragments) {
            context.save();
            context.translate(piece.x + piece.width / 2, piece.y + BLOCK_HEIGHT / 2);
            context.rotate(piece.angle);
            drawBlock(context, { x: -piece.width / 2, y: -BLOCK_HEIGHT / 2, width: piece.width, dark: piece.dark });
            context.restore();
        }
    }
    context.translate(0, -game.camera);
    if (game.feedbackTime > 0 && game.feedback && game.phase === "running") {
        context.globalAlpha = Math.min(1, game.feedbackTime * 4);
        context.fillStyle = "#77809e";
        context.font = "500 16px 'Geist Variable', sans-serif";
        context.textAlign = "center";
        context.fillText(game.feedback, 0, 26);
        context.globalAlpha = 1;
    }
}
