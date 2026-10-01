import { useId } from "react";

export type SocialBrand = "github" | "linkedin" | "facebook" | "instagram" | "x" | "tiktok";

const paths = {
    github: "M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.07c-3.09.67-3.74-1.31-3.74-1.31-.5-1.28-1.23-1.62-1.23-1.62-1.01-.7.08-.68.08-.68 1.12.08 1.7 1.14 1.7 1.14.99 1.69 2.6 1.2 3.23.92.1-.72.39-1.2.71-1.48-2.47-.28-5.07-1.24-5.07-5.49 0-1.21.43-2.2 1.14-2.97-.11-.28-.49-1.41.11-2.94 0 0 .93-.3 3.05 1.14a10.63 10.63 0 0 1 5.55 0c2.12-1.44 3.05-1.14 3.05-1.14.6 1.53.22 2.66.11 2.94.71.77 1.14 1.76 1.14 2.97 0 4.26-2.61 5.21-5.1 5.49.4.34.75 1.02.75 2.06v3.04c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z",
    linkedin: "M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.96V9.2h2.97v9.55ZM6.44 7.9a1.72 1.72 0 1 1 0-3.44 1.72 1.72 0 0 1 0 3.44Zm12.31 10.85h-2.96V14.1c0-1.11-.02-2.53-1.54-2.53-1.54 0-1.78 1.2-1.78 2.45v4.73H9.51V9.2h2.84v1.3h.04c.4-.75 1.37-1.54 2.81-1.54 3 0 3.55 1.97 3.55 4.53v5.26Z",
    facebook: "M22 12A10 10 0 1 0 10.44 21.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z",
    x: "M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.89-7.48L5.51 22H2.4l8.2-9.38L.8 2h6.41l4.42 6.78L18.9 2Zm-1.1 18h1.73L6.28 3.88H4.43L17.8 20Z",
    tiktok: "M16.7 1.5c.32 2.69 1.83 4.3 4.8 4.48v3.34a8.3 8.3 0 0 1-4.8-1.55v7.28a7.02 7.02 0 1 1-6.05-6.95v3.47a3.65 3.65 0 1 0 2.68 3.52V1.5h3.37Z",
};

export default function SocialIcon({ brand }: { brand: SocialBrand }) {
    const gradientId = useId();

    return (
        <svg className="contact-social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            {brand === "instagram" ? <>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0" stopColor="#feda75" />
                        <stop offset=".25" stopColor="#fa7e1e" />
                        <stop offset=".5" stopColor="#d62976" />
                        <stop offset=".75" stopColor="#962fbf" />
                        <stop offset="1" stopColor="#4f5bd5" />
                    </linearGradient>
                </defs>
                <g fill="none" stroke="currentColor" strokeWidth="1.9">
                    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                    <circle cx="12" cy="12" r="4.4" />
                    <circle cx="17.8" cy="6.3" r="1.1" fill="currentColor" stroke="none" />
                </g>
                <g className="contact-instagram-color" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.9">
                    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                    <circle cx="12" cy="12" r="4.4" />
                    <circle cx="17.8" cy="6.3" r="1.1" fill={`url(#${gradientId})`} stroke="none" />
                </g>
            </> : <>
                {brand === "tiktok" && <g className="contact-tiktok-color">
                    <path d={paths.tiktok} fill="#25f4ee" transform="translate(-.7 -.45)" />
                    <path d={paths.tiktok} fill="#fe2c55" transform="translate(.7 .45)" />
                </g>}
                <path d={paths[brand]} />
            </>}
        </svg>
    );
}
