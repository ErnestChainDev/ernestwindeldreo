import { useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import contractLens from "../../assets/projects/contraclens.png";
import learnersAi from "../../assets/projects/learners-ai.png";
import truthFinder from "../../assets/projects/truthfinder.png";
import codeVerse from "../../assets/projects/codeverse.png";
import christmasTree from "../../assets/projects/christmas-tree.png";
import profileViews from "../../assets/projects/profileviews.png";
import "./Projects.css";

const filters = ["All projects", "Web apps", "AI & ML", "Web3"] as const;
type Filter = typeof filters[number];

type Project = {
    name: string;
    description: string;
    image: string;
    tags: string[];
    categories: Filter[];
    github: string;
    demo: string;
};

const projects: Project[] = [
    {
        name: "ContractLens",
        description: "Smart contract insights, made simple.",
        image: contractLens,
        tags: ["React", "TypeScript", "Web3"],
        categories: ["Web3"],
        github: "https://github.com/ErnestChainDev/ContractLens",
        demo: "https://contract-lens-tau.vercel.app/",
    },
    {
        name: "Learners-AI",
        description: "Personalized learning with explainable AI.",
        image: learnersAi,
        tags: ["React", "Python", "AI"],
        categories: ["Web apps", "AI & ML"],
        github: "https://github.com/ErnestChainDev/Learners-AI",
        demo: "https://learners-ai.vercel.app/",
    },
    {
        name: "TruthFinder",
        description: "Explore fake news and spam detection.",
        image: truthFinder,
        tags: ["Python", "Machine Learning"],
        categories: ["AI & ML"],
        github: "https://github.com/ErnestChainDev/TruthFinder",
        demo: "https://truth-finder-wine.vercel.app/",
    },
    {
        name: "CodeVerse",
        description: "Learn new skills with free online courses.",
        image: codeVerse,
        tags: ["E-learning", "Web app"],
        categories: ["Web apps"],
        github: "https://github.com/ErnestChainDev/CodeVerse",
        demo: "https://code-verse-six.vercel.app/",
    },
    {
        name: "3D Christmas Tree",
        description: "An interactive Christmas tree controlled by hand gestures.",
        image: christmasTree,
        tags: ["3D", "Hand gestures"],
        categories: ["Web apps"],
        github: "https://github.com/ErnestChainDev/Christmas-Tree",
        demo: "https://christmas-tree-hand-gestures.vercel.app/",
    },
    {
        name: "GitHub ProfileViews",
        description: "A simple way to track visits to your GitHub profile.",
        image: profileViews,
        tags: ["GitHub", "Analytics"],
        categories: ["Web apps"],
        github: "https://github.com/ErnestChainDev/Github-Profile-Views",
        demo: "https://github-profile-views-two.vercel.app/",
    },
];

function GitHubIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.07c-3.09.67-3.74-1.31-3.74-1.31-.5-1.28-1.23-1.62-1.23-1.62-1.01-.7.08-.68.08-.68 1.12.08 1.7 1.14 1.7 1.14.99 1.69 2.6 1.2 3.23.92.1-.72.39-1.2.71-1.48-2.47-.28-5.07-1.24-5.07-5.49 0-1.21.43-2.2 1.14-2.97-.11-.28-.49-1.41.11-2.94 0 0 .93-.3 3.05 1.14a10.63 10.63 0 0 1 5.55 0c2.12-1.44 3.05-1.14 3.05-1.14.6 1.53.22 2.66.11 2.94.71.77 1.14 1.76 1.14 2.97 0 4.26-2.61 5.21-5.1 5.49.4.34.75 1.02.75 2.06v3.04c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
        </svg>
    );
}

export default function Projects() {
    const [activeFilter, setActiveFilter] = useState<Filter>("All projects");
    const visibleProjects = projects.filter(project => activeFilter === "All projects" || project.categories.includes(activeFilter));

    return (
        <section className="projects" aria-labelledby="projects-heading">
            <header className="projects-header">
                <div>
                    <h1 id="projects-heading">Projects.</h1>
                    <p>A selection of things I've designed and built.</p>
                </div>
                <span className="projects-eyebrow">Selected work / 2026</span>
            </header>

            <div className="projects-filters" role="group" aria-label="Filter projects">
                {filters.map(filter => (
                    <button
                        key={filter}
                        type="button"
                        className={activeFilter === filter ? "is-active" : undefined}
                        aria-pressed={activeFilter === filter}
                        aria-controls="projects-grid"
                        onClick={() => setActiveFilter(filter)}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            <p className="projects-status" role="status">
                {visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"} shown: {activeFilter}.
            </p>

            <div id="projects-grid" className="projects-grid">
                {visibleProjects.map((project, index) => (
                    <article className="project-card" key={project.name}>
                        <a className="project-card-preview" href={project.demo} target="_blank" rel="noopener noreferrer" aria-label={`Open ${project.name} live demo (opens in a new tab)`}>
                            <img src={project.image} alt={`${project.name} website preview`} loading={index < 2 ? "eager" : "lazy"} decoding="async" />
                        </a>
                        <div className="project-card-content">
                            <h2>{project.name}</h2>
                            <p>{project.description}</p>
                            <div className="project-card-footer">
                                <ul className="project-card-tags" aria-label={`${project.name} technologies and topics`}>
                                    {project.tags.map(tag => <li key={tag}>{tag}</li>)}
                                </ul>
                                <div className="project-card-links">
                                    <a href={project.github} target="_blank" rel="noopener noreferrer" aria-label={`${project.name} on GitHub (opens in a new tab)`}>
                                        <GitHubIcon />
                                        <span>GitHub</span>
                                        <ArrowRight className="project-link-arrow" aria-hidden="true" />
                                    </a>
                                    <a href={project.demo} target="_blank" rel="noopener noreferrer" aria-label={`${project.name} live demo (opens in a new tab)`}>
                                        <ExternalLink aria-hidden="true" />
                                        <span>Live demo</span>
                                        <ArrowRight className="project-link-arrow" aria-hidden="true" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
            <footer className="projects-footer">Built with curiosity.</footer>
        </section>
    );
}
