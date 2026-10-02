import { useState } from "react";
import { ArrowUpRight, Building2, Landmark, RotateCw, X } from "lucide-react";
import OrbitalAvatar from "../components/OrbitalAvatar";
import SocialIcon from "../components/Contact/SocialIcon";
import { socialProfiles } from "../lib/social-profiles";
import contractLens from "../assets/projects/contraclens.webp";
import learnersAi from "../assets/projects/learners-ai.webp";
import "./HomePage.css";

const projects = [
    {
        name: "ContractLens", href: "https://contract-lens-tau.vercel.app/", image: contractLens, tourId: "project-contractlens",
        description: "A clearer view of smart contracts.", tags: ["Web3", "React"],
    },
    {
        name: "Learners AI", href: "https://learners-ai.vercel.app/", image: learnersAi, tourId: "project-learners-ai",
        description: "Personalized learning with explainable AI.", tags: ["AI", "Full-stack"],
    },
];

const toolkit = ["React", "TypeScript", "Vite", "Node.js", "Python", "PostgreSQL", "Tailwind CSS", "Next.js"];

type HomePageProps = {
    tourActive: boolean;
    hasToured: boolean;
    onStartTour: () => void;
};

export default function HomePage({ tourActive, hasToured, onStartTour }: HomePageProps) {
    const [reminderDismissed, setReminderDismissed] = useState(false);

    return (
        <main className={`home-main${tourActive ? " home-main--tour" : ""}`}>
            <div className="home-dot-accent" aria-hidden="true" />
            <div className="home-topbar">
                <span className="home-availability"><span aria-hidden="true" />Open to opportunities</span>
                <div className="home-topbar-actions">
                    {!reminderDismissed && (
                        <div className="home-tour-reminder">
                            <button type="button" className="home-tour-trigger" onClick={onStartTour} disabled={tourActive} aria-haspopup="dialog">
                                <RotateCw aria-hidden="true" />
                                {tourActive ? "tour in progress" : hasToured ? "take the tour again" : "take the tour"}
                            </button>
                            {!tourActive && (
                                <button type="button" className="home-tour-dismiss" aria-label="Dismiss tour reminder" onClick={() => setReminderDismissed(true)}>
                                    <X aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    )}
                    <span className="home-location">Philippines</span>
                </div>
            </div>

            <section className="home-hero" aria-labelledby="home-heading">
                <div className="home-hero-copy">
                    <h1 id="home-heading" tabIndex={-1}>
                        <span>Building thoughtful</span>
                        <span>digital experiences.</span>
                    </h1>
                    <p>Hi, I’m Ernest. A full-stack developer exploring AI,<br className="home-desktop-break" /> thoughtful interfaces, and practical software.</p>
                    <div className="home-hero-actions">
                        <a className="home-button home-button-primary" href="/projects" data-tour="projects">View projects <ArrowUpRight aria-hidden="true" /></a>
                        <a className="home-button" href="/contact" data-tour="contact">Contact me</a>
                    </div>
                    <nav className="home-socials" aria-label="Find Ernest online">
                        {socialProfiles.map(({ name, brand, href }) => (
                            <a key={brand} href={href} data-tour={`social-${brand}`} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`} title={name}>
                                <SocialIcon brand={brand} />
                            </a>
                        ))}
                    </nav>
                </div>

                <OrbitalAvatar />
            </section>

            <section className="home-projects" aria-labelledby="home-projects-heading">
                <header className="home-section-heading">
                    <h2 id="home-projects-heading">Selected projects</h2>
                    <a href="/projects" className="home-view-all">View all <ArrowUpRight aria-hidden="true" /></a>
                </header>
                <div className="home-project-grid">
                    {projects.map((project) => (
                        <a className="home-project-card" key={project.href} data-tour={project.tourId} href={project.href} target="_blank" rel="noopener noreferrer" aria-label={`${project.name}: ${project.description} (opens in a new tab)`}>
                            <div className="home-project-preview">
                                <img src={project.image} alt={`${project.name} website preview`} draggable={false} decoding="async" />
                            </div>
                            <div className="home-project-info">
                                <h3>{project.name}</h3>
                                <p>{project.description}</p>
                                <div className="home-project-tags">
                                    {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
                                </div>
                                <ArrowUpRight className="home-project-arrow" aria-hidden="true" />
                            </div>
                        </a>
                    ))}
                </div>
            </section>

            <div className="home-bottom-grid">
                <section className="home-experience" aria-labelledby="home-experience-heading" data-tour="experience">
                    <h2 id="home-experience-heading"><a href="/experience">Experience</a></h2>
                    <a className="home-experience-row" href="/experience">
                        <Landmark aria-hidden="true" />
                        <span><strong>Department of Information and Communication Technology - DICT Region V</strong><small>IT Intern</small></span>
                    </a>
                    <a className="home-experience-row" href="/experience">
                        <Building2 aria-hidden="true" />
                        <span><strong>Zetheta Algorithms Private Limited</strong><small>Software Engineering Trainee</small></span>
                    </a>
                </section>
                <section className="home-toolkit" aria-labelledby="home-toolkit-heading" data-tour="toolkit">
                    <h2 id="home-toolkit-heading"><a href="/stack">My toolkit</a></h2>
                    <div className="home-toolkit-tags">
                        {[toolkit.slice(0, 4), toolkit.slice(4)].map((row) => (
                            <div className="home-toolkit-row" key={row[0]}>
                                {row.map(tool => <a key={tool} href="/stack">{tool}</a>)}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
