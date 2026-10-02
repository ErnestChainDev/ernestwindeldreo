import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import SocialIcon from "./SocialIcon";
import { socialProfiles } from "../../lib/social-profiles";
import "./Contact.css";

const email = "ernestchaindev@gmail.com";
const topics = ["Project inquiry", "Job opportunity", "Just saying hi"] as const;

export default function Contact() {
    const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
    const [draftReady, setDraftReady] = useState(false);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (copyTimer.current) clearTimeout(copyTimer.current);
    }, []);

    async function copyEmail() {
        if (copyTimer.current) clearTimeout(copyTimer.current);
        try {
            await navigator.clipboard.writeText(email);
            setCopyState("copied");
        } catch {
            setCopyState("error");
        }
        copyTimer.current = setTimeout(() => setCopyState("idle"), 4000);
    }

    function prepareEmail(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const name = String(data.get("name") || "").trim();
        const replyTo = String(data.get("email") || "").trim();
        const message = String(data.get("message") || "").trim();
        for (const field of ["name", "message"] as const) {
            const input = form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement;
            input.setCustomValidity(input.value.trim() ? "" : "Please fill out this field.");
        }
        if (!form.reportValidity()) return;

        const subject = `${data.get("topic")} — ${name}`;
        const body = `${message}\n\nFrom: ${name}\nReply to: ${replyTo}`;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setDraftReady(true);
    }

    return (
        <section className="contact" aria-labelledby="contact-heading">
            <div className="contact-intro">
                <p className="contact-eyebrow">Let’s connect</p>
                <h1 id="contact-heading">Let’s build<br />something.</h1>
                <p className="contact-description">Have an idea, an opportunity, or a question?<br className="contact-desktop-break" /> I’d love to hear from you.</p>

                <div className="contact-email-block">
                    <h2 className="contact-eyebrow">Email me</h2>
                    <div className="contact-email-row">
                        <a href={`mailto:${email}`}>{email}</a>
                        <button type="button" className="contact-copy" onClick={() => void copyEmail()} aria-label={copyState === "copied" ? "Email address copied" : "Copy email address"} title="Copy email address">
                            {copyState === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                        </button>
                    </div>
                    <p className="contact-location">Based in the Philippines</p>
                    <p className="contact-copy-status" role="status">{copyState === "copied" ? "Email copied." : copyState === "error" ? "Couldn’t copy. You can select the email address above." : ""}</p>
                </div>

                <nav className="contact-online" aria-labelledby="contact-social-heading">
                    <h2 className="contact-eyebrow" id="contact-social-heading">Find me online</h2>
                    <ul className="contact-socials">
                        {socialProfiles.map(social => (
                            <li key={social.brand}>
                                <a
                                    className={`contact-social contact-social--${social.brand}`}
                                    href={social.href}
                                    target={social.href ? "_blank" : undefined}
                                    rel={social.href ? "noopener noreferrer" : undefined}
                                    role={social.href ? undefined : "link"}
                                    tabIndex={social.href ? undefined : 0}
                                    aria-disabled={social.href ? undefined : true}
                                    aria-label={social.href ? `${social.name} (opens in a new tab)` : `${social.name} — profile link not added yet`}
                                    title={social.href ? social.name : "Profile link not added yet"}
                                >
                                    <SocialIcon brand={social.brand} />
                                    <span>{social.name}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            <div className="contact-form-section">
                <header className="contact-form-heading">
                    <h2>Get in touch.</h2>
                    <p>Tell me a little about what you have in mind.</p>
                </header>
                <form className="contact-form" onSubmit={prepareEmail} onInput={event => {
                    const field = event.target;
                    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.setCustomValidity("");
                    setDraftReady(false);
                }}>
                    <div className="contact-field">
                        <label htmlFor="contact-name">Your name</label>
                        <input id="contact-name" name="name" autoComplete="name" placeholder="What should I call you?" required maxLength={100} />
                    </div>
                    <div className="contact-field">
                        <label htmlFor="contact-email">Email address</label>
                        <input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
                    </div>
                    <fieldset className="contact-topics">
                        <legend>What’s this about?</legend>
                        <div className="contact-topic-options">
                            {topics.map((topic, index) => (
                                <label className="contact-topic" key={topic}>
                                    <input type="radio" name="topic" value={topic} defaultChecked={index === 0} />
                                    <span>{topic}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div className="contact-field">
                        <label htmlFor="contact-message">Message</label>
                        <textarea id="contact-message" name="message" placeholder="A little about your project or opportunity…" required maxLength={3000} rows={5} />
                    </div>
                    <div className="contact-submit-area">
                        <button className="contact-submit" type="submit" aria-describedby="contact-form-note">Send message <ArrowUpRight aria-hidden="true" /></button>
                        <p className="contact-form-note" id="contact-form-note" role="status" aria-live="polite" aria-atomic="true">
                            {draftReady ? "Finish sending in your email app. Didn’t open? Use the email address on this page." : "Opens your email app. Your details will only be used to reply."}
                        </p>
                    </div>
                </form>
            </div>
        </section>
    );
}
