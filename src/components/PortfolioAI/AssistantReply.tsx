import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { navigateTo } from "../../lib/navigation";

const portfolioPaths = new Set(["/projects", "/experience", "/stack", "/certifications"]);

function safeHref(value: string) {
    if (portfolioPaths.has(value)) return value;
    try {
        const url = new URL(value);
        if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch { /* Unsupported links remain plain text. */ }
    return null;
}

function ResponseLink({ href, children }: { href: string; children: ReactNode }) {
    const internal = portfolioPaths.has(href);
    return <a href={href} target={internal ? undefined : "_blank"} rel={internal ? undefined : "noopener noreferrer"}
        onClick={event => {
            if (internal && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                navigateTo(href);
            }
        }}>{children}</a>;
}

// Render a small, text-only Markdown subset. Model output never becomes HTML.
function inlineText(value: string, allowBold = true): ReactNode[] {
    const pattern = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^\s)]+\)|https?:\/\/[^\s<>]+)/g;
    const nodes: ReactNode[] = [];
    let start = 0;
    for (const match of value.matchAll(pattern)) {
        const token = match[0];
        nodes.push(value.slice(start, match.index));
        const link = token.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
        if (token.startsWith("**") && allowBold) {
            nodes.push(<strong key={match.index}>{inlineText(token.slice(2, -2), false)}</strong>);
        } else if (link) {
            const href = safeHref(link[2]);
            nodes.push(href ? <ResponseLink key={match.index} href={href}>{link[1]}</ResponseLink> : token);
        } else if (/^https?:\/\//.test(token)) {
            const url = token.replace(/[.,!?;:)\]]+$/, "");
            const href = safeHref(url);
            nodes.push(href ? <Fragment key={match.index}><ResponseLink href={href}>{url}</ResponseLink>{token.slice(url.length)}</Fragment> : token);
        } else nodes.push(token);
        start = match.index + token.length;
    }
    nodes.push(value.slice(start));
    return nodes;
}

function formattedText(content: string) {
    const blocks: ReactNode[] = [];
    const lines = content.replace(/\r\n?/g, "\n").split("\n");
    let paragraph: string[] = [];
    let list: string[] = [];
    let ordered = false;
    function flushParagraph() {
        if (paragraph.length) blocks.push(<p key={blocks.length}>{inlineText(paragraph.join("\n"))}</p>);
        paragraph = [];
    }
    function flushList() {
        if (list.length) {
            const Tag = ordered ? "ol" : "ul";
            blocks.push(<Tag key={blocks.length}>{list.map((item, index) => <li key={index}>{inlineText(item)}</li>)}</Tag>);
        }
        list = [];
    }
    for (const rawLine of lines) {
        const line = rawLine.trim();
        const heading = line.match(/^(?:#{1,6}\s+(.+)|\*\*([^*]+)\*\*:?)$/);
        const tools = line.match(/^(?:\*\*)?Tools:(?:\*\*)?\s*(.+)$/i);
        const item = line.match(/^(?:([-*•])|\d+[.)])\s+(.+)$/);
        if (item) {
            flushParagraph();
            const isOrdered = !item[1];
            if (list.length && ordered !== isOrdered) flushList();
            ordered = isOrdered;
            list.push(item[2]);
            continue;
        }
        flushList();
        if (!line || heading || tools) flushParagraph();
        if (heading) blocks.push(<h3 key={blocks.length}>{inlineText(heading[1] ?? heading[2])}</h3>);
        else if (tools) blocks.push(<p className="portfolio-ai-tools-line" key={blocks.length}>{inlineText(tools[1])}</p>);
        else if (line) paragraph.push(line);
    }
    flushParagraph();
    flushList();
    return blocks;
}

export default function AssistantReply({ content }: { content: string }) {
    const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    const trailingLink = content.match(/(?:^|\n)\[([^\]\n]+)\]\((\/projects|\/experience|\/stack|\/certifications)\)\s*$/);
    const body = trailingLink ? content.slice(0, trailingLink.index).trimEnd() : content;

    async function copyResponse() {
        if (timer.current) clearTimeout(timer.current);
        try {
            await navigator.clipboard.writeText(content);
            setCopyState("copied");
            timer.current = setTimeout(() => setCopyState("idle"), 2500);
        } catch {
            setCopyState("error");
        }
    }

    return <>
        <div className="portfolio-ai-message-content">{formattedText(body)}</div>
        <div className="portfolio-ai-message-actions">
            {trailingLink && <ResponseLink href={trailingLink[2]}><span>{trailingLink[1]}</span><ArrowUpRight aria-hidden="true" /></ResponseLink>}
            <button className="portfolio-ai-copy" type="button" onClick={() => void copyResponse()}
                aria-label={copyState === "copied" ? "Response copied" : "Copy Erza’s response"} title={copyState === "copied" ? "Copied" : "Copy response"}>
                {copyState === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </button>
            <span className={copyState === "error" ? "portfolio-ai-copy-error" : "portfolio-ai-sr-only"} role="status">
                {copyState === "copied" ? "Response copied." : copyState === "error" ? "Couldn’t copy. Select the response text to copy it." : ""}
            </span>
        </div>
    </>;
}
