import { ArrowUpRight, Building2, Landmark } from "lucide-react";
import BrandMark from "../components/BrandMark";
import contractLens from "../assets/projects/contraclens.png";
import learnersAi from "../assets/projects/learners-ai.png";
import "./HomePage.css";

const projects = [
    {
        name: "ContractLens", href: "https://contract-lens-tau.vercel.app/", image: contractLens,
        description: "A clearer view of smart contracts.", tags: ["Web3", "React"],
    },
    {
        name: "Learners AI", href: "https://learners-ai.vercel.app/", image: learnersAi,
        description: "Personalized learning with explainable AI.", tags: ["AI", "Full-stack"],
    },
];

const toolkit = ["React", "TypeScript", "Node.js", "Python", "MySQL", "PostgreSQL", "Tailwind CSS", "Next.js", "Railway"];

export default function HomePage() {
    return (
        <main className="home-main">
            <div className="home-topbar">
                <span className="home-availability"><span aria-hidden="true" />Open to opportunities</span>
                <span className="home-location">Philippines</span>
            </div>

            <section className="home-hero" aria-labelledby="home-heading">
                <div className="home-hero-copy">
                    <h1 id="home-heading" tabIndex={-1}>
                        <span>Building thoughtful</span>
                        <span>digital experiences.</span>
                    </h1>
                    <p>Hi, I’m Ernest. A full-stack developer exploring AI,<br className="home-desktop-break" /> thoughtful interfaces, and practical software.</p>
                    <div className="home-hero-actions">
                        <a className="home-button home-button-primary" href="/projects">View projects <ArrowUpRight aria-hidden="true" /></a>
                        <a className="home-button" href="/contact">Contact me</a>
                    </div>
                </div>

                <div className="home-orbit" aria-hidden="true">
                    <div className="home-dot-accent" />
                    <svg viewBox="0 0 320 320" fill="none">
                        <circle cx="160" cy="160" r="142" stroke="#d8d8de" />
                        <circle cx="160" cy="160" r="107" stroke="#a1a1aa" />
                        <g className="home-orbit-markers">
                            <circle cx="256.8" cy="56.1" r="5.5" fill="#0b0b0c" />
                            <circle cx="18" cy="160" r="5.5" fill="#a4a4a9" />
                        </g>
                        <g className="home-orbit-markers home-orbit-markers-inner">
                            <circle cx="217" cy="250.6" r="8" fill="#303034" />
                        </g>
                    </svg>
                    <BrandMark className="home-orbit-logo" />
                </div>
            </section>

            <section className="home-projects" aria-labelledby="home-projects-heading">
                <header className="home-section-heading font-satoshi-italic">
                    <h2 id="home-projects-heading">Selected projects</h2>
                    <a href="/projects" className="home-view-all">View all <ArrowUpRight aria-hidden="true" /></a>
                </header>
                <div className="home-project-grid">
                    {projects.map((project) => (
                        <a className="home-project-card" key={project.href} href={project.href} target="_blank" rel="noopener noreferrer">
                            <div className="home-project-preview">
                                <img src={project.image} alt={`${project.name} website preview`} draggable={false} />
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
                <section className="home-experience" aria-labelledby="home-experience-heading">
                    <h2 id="home-experience-heading" className="font-satoshi-italic"><a href="/experience">Experience</a></h2>
                    <a className="home-experience-row" href="/experience">
                        <Landmark aria-hidden="true" />
                        <span><strong>Department of Information and Communication Technology - DICT Region V</strong><small>IT Intern</small></span>
                    </a>
                    <a className="home-experience-row" href="/experience">
                        <Building2 aria-hidden="true" />
                        <span><strong>Zetheta Algorithms Private Limited</strong><small>Software Engineering Trainee</small></span>
                    </a>
                </section>
                <section className="home-toolkit" aria-labelledby="home-toolkit-heading">
                    <h2 id="home-toolkit-heading" className="font-satoshi-italic"><a href="/stack">My toolkit</a></h2>
                    <div className="home-toolkit-tags">
                        {toolkit.map((tool) => <a key={tool} href="/stack">{tool}</a>)}
                    </div>
                </section>
            </div>
        </main>
    );
}
