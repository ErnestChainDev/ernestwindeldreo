import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, ArrowUpRight, Plus, RotateCcw, Square } from "lucide-react";
import erzaAvatar from "../../assets/avatargroup/avatar5.png";
import { navigateTo } from "../../lib/navigation";
import AssistantReply from "./AssistantReply";
import "./PortfolioAI.css";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
const suggestions = [
    "What projects has Ernest built?",
    "Tell me about his experience.",
    "What technologies does he use?",
    "How can I get in touch?",
];

function goBack() {
    if (window.history.state?.portfolioReturnTo && window.history.length > 1) window.history.back();
    else navigateTo("/");
}

function requestHistory(messages: ChatMessage[]) {
    const history = messages.slice(-19).map(({ role, content }) => ({ role, content: content.slice(0, role === "user" ? 2000 : 8000) }));
    const encoder = new TextEncoder();
    while (history.length > 1 && encoder.encode(JSON.stringify({ messages: history })).length > 24_000) history.splice(0, 2);
    return history;
}

export default function PortfolioAI() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const hasMessages = messages.length > 0;

    useEffect(() => {
        function onEscape(event: globalThis.KeyboardEvent) {
            if (event.key !== "Escape" || event.isComposing || event.defaultPrevented) return;
            event.preventDefault();
            goBack();
        }
        window.addEventListener("keydown", onEscape);
        return () => {
            window.removeEventListener("keydown", onEscape);
            requestRef.current?.abort();
        };
    }, []);

    useLayoutEffect(() => {
        const input = inputRef.current;
        if (!input) return;
        input.style.height = "auto";
        input.style.height = `${Math.min(input.scrollHeight, 144)}px`;
    }, [draft]);

    useEffect(() => {
        const stage = stageRef.current;
        if (messages.length && stage) stage.scrollTop = stage.scrollHeight;
    }, [messages, pending, error]);

    async function requestAnswer(conversation: ChatMessage[]) {
        if (requestRef.current) return;
        const controller = new AbortController();
        requestRef.current = controller;
        setPending(true);
        setError(null);
        try {
            const response = await fetch("/api/portfolio-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: requestHistory(conversation) }),
                signal: AbortSignal.any([controller.signal, AbortSignal.timeout(100_000)]),
            });
            const result: unknown = await response.json();
            if (!response.ok) {
                throw new Error(result && typeof result === "object" && "error" in result && typeof result.error === "string"
                    ? result.error : "Something went wrong. Please try again.");
            }
            if (!result || typeof result !== "object" || !("reply" in result) || typeof result.reply !== "string" || !result.reply.trim()) {
                throw new Error("No response came through. Please try again.");
            }
            if (requestRef.current !== controller || controller.signal.aborted) return;
            setMessages([...conversation, { id: crypto.randomUUID(), role: "assistant", content: result.reply }]);
        } catch (failure) {
            if (requestRef.current !== controller || controller.signal.aborted) return;
            setError(failure instanceof Error && failure.name === "TimeoutError"
                ? "That response took too long. Please try again."
                : failure instanceof TypeError || failure instanceof SyntaxError
                    ? "Couldn't reach the assistant. Check your connection and try again."
                    : failure instanceof Error ? failure.message : "Something went wrong. Please try again.");
        } finally {
            if (requestRef.current === controller) {
                requestRef.current = null;
                setPending(false);
                inputRef.current?.focus({ preventScroll: true });
            }
        }
    }

    function sendMessage(content = draft) {
        const question = content.trim();
        if (!question || question.length > 2000 || requestRef.current) return;
        const conversation: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", content: question }];
        setMessages(conversation);
        setDraft("");
        void requestAnswer(conversation);
    }

    function stopResponse() {
        requestRef.current?.abort();
        requestRef.current = null;
        setPending(false);
        setError("Response stopped. You can retry or ask another question.");
    }

    function newChat() {
        requestRef.current?.abort();
        requestRef.current = null;
        setPending(false);
        setMessages([]);
        setDraft("");
        setError(null);
        inputRef.current?.focus({ preventScroll: true });
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            sendMessage();
        }
    }

    return (
        <main className={`portfolio-ai${hasMessages ? " portfolio-ai--chat" : ""}`} aria-labelledby="portfolio-ai-heading">
            <div className="portfolio-ai-topbar">
                <p className="portfolio-ai-brand"><span>Ernest Windel Dreo</span><span aria-hidden="true">/</span><span>Erza — AI assistant</span></p>
                <button className="portfolio-ai-back" type="button" onClick={goBack} aria-label="Go back to portfolio" aria-keyshortcuts="Escape">
                    <kbd aria-hidden="true">Esc</kbd><span>to go back</span>
                </button>
            </div>
            <header className="portfolio-ai-hero">
                <h1 id="portfolio-ai-heading">Ask anything.</h1>
                {hasMessages && <button className="portfolio-ai-new-chat" type="button" onClick={newChat}><Plus aria-hidden="true" />New chat</button>}
            </header>
            <div className="portfolio-ai-stage" ref={stageRef}>
                {!hasMessages ? (
                    <div className="portfolio-ai-welcome">
                        <img className="portfolio-ai-avatar portfolio-ai-avatar--welcome" src={erzaAvatar} alt="Erza" width={160} height={160} />
                        <p className="portfolio-ai-eyebrow">Your portfolio guide</p>
                        <h2>Hi, I’m Erza.</h2>
                        <p className="portfolio-ai-intro">Ask me anything about Ernest’s work.</p>
                        <p className="portfolio-ai-description">Explore his projects, experience, and the tools he uses.</p>
                        <div className="portfolio-ai-suggestions" role="group" aria-label="Suggested questions">
                            {suggestions.map(question => (
                                <button type="button" key={question} onClick={() => sendMessage(question)}>
                                    <span>{question}</span><ArrowUpRight aria-hidden="true" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="portfolio-ai-conversation">
                        <div className="portfolio-ai-messages" role="log" aria-label="Conversation with Erza" aria-live="polite" aria-relevant="additions" aria-busy={pending}>
                            {messages.map(message => (
                                <article className={`portfolio-ai-message portfolio-ai-message--${message.role}`} key={message.id} aria-label={message.role === "user" ? "Your message" : "Erza’s response"}>
                                    {message.role === "assistant" ? <>
                                        <img className="portfolio-ai-avatar" src={erzaAvatar} alt="" width={60} height={60} />
                                        <div className="portfolio-ai-message-body">
                                            <p className="portfolio-ai-message-label">Erza</p>
                                            <AssistantReply content={message.content} />
                                        </div>
                                    </> : <div className="portfolio-ai-message-content">{message.content}</div>}
                                </article>
                            ))}
                        </div>
                        {pending && <div className="portfolio-ai-thinking" role="status">
                            <img className="portfolio-ai-avatar" src={erzaAvatar} alt="" width={60} height={60} />
                            <div><p className="portfolio-ai-message-label">Erza</p><p>Thinking<span className="portfolio-ai-thinking-dots" aria-hidden="true">...</span></p></div>
                        </div>}
                        {error && (
                            <div className="portfolio-ai-error">
                                <p role="alert">{error}</p>
                                <button type="button" onClick={() => void requestAnswer(messages)}><RotateCcw aria-hidden="true" />Try again</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="portfolio-ai-composer">
                <form onSubmit={event => { event.preventDefault(); sendMessage(); }} aria-label="Ask Erza">
                    <label className="portfolio-ai-sr-only" htmlFor="portfolio-ai-input">Ask Erza about Ernest’s work</label>
                    <textarea
                        id="portfolio-ai-input" ref={inputRef} value={draft} rows={1} maxLength={2000}
                        onChange={event => setDraft(event.target.value)} onKeyDown={handleKeyDown}
                        placeholder={hasMessages ? "Ask a follow-up..." : "Ask Erza anything..."} aria-describedby="portfolio-ai-input-help"
                    />
                    {pending ? (
                        <button className="portfolio-ai-send" type="button" onClick={stopResponse} aria-label="Stop response"><Square aria-hidden="true" /></button>
                    ) : (
                        <button className="portfolio-ai-send" type="submit" disabled={!draft.trim()} aria-label="Send message"><ArrowUp aria-hidden="true" /></button>
                    )}
                </form>
                <div className="portfolio-ai-composer-notes">
                    <p id="portfolio-ai-input-help">Enter to send <span aria-hidden="true">·</span> Shift + Enter for a new line</p>
                    {draft.length > 1800 && <span>{draft.length}/2,000</span>}
                    <p>AI responses may be inaccurate.</p>
                </div>
            </div>
        </main>
    );
}
