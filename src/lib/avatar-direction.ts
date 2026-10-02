export type AvatarDirection = "front" | "up" | "down" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

const directions: AvatarDirection[] = ["right", "bottom-right", "down", "bottom-left", "left", "top-left", "up", "top-right"];

// Screen coordinates point downwards. Divide the cursor angle into eight gazes.
export function avatarDirection(dx: number, dy: number, deadZone: number): AvatarDirection {
    if (Math.hypot(dx, dy) <= deadZone) return "front";
    const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    return directions[(sector + directions.length) % directions.length];
}
