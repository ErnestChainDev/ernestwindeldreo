import { Sparkle } from "lucide-react";
import "./Experience.css";

type ExperienceEntry = {
    role: string;
    organization: string;
    period: string;
    context?: string[];
    organizationDetail?: string;
    highlights?: string[];
    description?: string[];
    tags?: string[];
    tagLabel?: string;
};

type ExperienceSection = {
    id: string;
    title: string;
    start: number;
    entries: ExperienceEntry[];
};

const sections: ExperienceSection[] = [
    {
        id: "internships",
        title: "Internship experience",
        start: 1,
        entries: [
            {
                role: "Software Engineer",
                organization: "Zetheta Algorithms Private Limited",
                period: "Jul – Aug 2026",
                context: ["Remote", "Internship"],
                highlights: [
                    "Designed distributed fintech architecture targeting 12,000+ TPS with Kafka, PostgreSQL sharding, and Redis caching (TARGET).",
                    "Developed Node.js/TypeScript transaction service with ACID transfers, idempotency and concurrency controls.",
                    "Designed account partitioning and cross-shard saga workflows without distributed locks on primary processing path.",
                    "Built Python ingestion for SWIFT MT940, ISO 20022 CAMT.053 XML and bank CSV, and documented architecture in draw.io.",
                ],
                tags: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Kafka", "Python"],
            },
            {
                role: "Information Technology (IT) Intern",
                organization: "Department of Information and Communications Technology",
                organizationDetail: "DICT Region V",
                period: "Jul – Aug 2025",
                context: ["Sorsogon City", "Internship"],
                highlights: [
                    "Assisted with computer assembly, hardware troubleshooting, Windows installation and maintenance.",
                    "Configured wired and wireless networks, RJ45 cabling and Starlink installation.",
                    "Supported digital literacy training and eGov Super App onboarding.",
                    "Prepared technical reports and presentations, coordinated LGU Zoom meetings and supported ICT events.",
                ],
                tags: ["Technical support", "Networking", "Documentation", "Event support"],
            },
        ],
    },
    {
        id: "projects",
        title: "Project leadership",
        start: 3,
        entries: [
            {
                role: "Lead Developer",
                organization: "Learner's AI — Course Recommendation with Explainable AI",
                period: "2026",
                context: ["Thesis project"],
                description: [
                    "Built personalized learning pathways based on learner interests, skills and academic preferences.",
                    "Developed React frontend and FastAPI/Node.js backend with LLM explanations and XAI to make recommendations understandable.",
                ],
                tags: ["React", "FastAPI", "Node.js", "LLMs", "XAI"],
            },
            {
                role: "Lead Developer",
                organization: "TruthFinder — Fake News Detection System",
                period: "2025",
                context: ["Machine learning"],
                description: [
                    "Built NLP classification with a five-stage preprocessing pipeline and 11+ text-mining features. Evaluated a Decision Tree with 87.5% accuracy and 87.1% F1 on the project test dataset. Created interactive analysis and model visualizations with custom CSV uploads for retraining.",
                ],
                tags: ["Python", "NLP", "Decision Tree", "JavaScript", "Chart.js"],
            },
        ],
    },
    {
        id: "leadership",
        title: "Student leadership",
        start: 5,
        entries: [
            {
                role: "BS Computer Science Representative",
                organization: "Supreme Student Council",
                period: "2024 – 2025",
                description: ["Represented students and helped coordinate university initiatives."],
            },
            {
                role: "Media Information Officer",
                organization: "Computing Society (ComSoc)",
                period: "2023 – 2024",
                description: ["Created promotional materials and activity announcements."],
            },
        ],
    },
    {
        id: "education",
        title: "Education",
        start: 7,
        entries: [
            {
                role: "BS Computer Science",
                organization: "Sorsogon State University – Bulan",
                organizationDetail: "Major in Software Engineering · Minor in Data Science",
                period: "2026",
                tagLabel: "Coursework",
                tags: ["Data Structures & Algorithms", "Software Engineering", "Operating Systems", "Database Systems", "Web & Mobile Development"],
            },
        ],
    },
];

export default function Experience() {
    return (
        <section className="experience" aria-labelledby="experience-heading">
            <header className="experience-header">
                <p className="experience-eyebrow">The journey so far</p>
                <h1 id="experience-heading">Experience.</h1>
                <p>Engineering, projects, and the experiences that shaped my work.</p>
            </header>

            <div className="experience-sections">
                {sections.map(section => (
                    <section className={`experience-section experience-section--${section.id}`} key={section.id} aria-labelledby={`experience-${section.id}`}>
                        <h2 className="experience-section-heading" id={`experience-${section.id}`}>
                            <span>{section.title}</span>
                        </h2>

                        <ol className="experience-entries" start={section.start}>
                            {section.entries.map((entry, index) => (
                                <li className="experience-entry" key={`${entry.role}-${entry.organization}`}>
                                    <div className="experience-meta">
                                        <span className="experience-number" aria-hidden="true">
                                            {String(section.start + index).padStart(2, "0")}
                                        </span>
                                        <p className="experience-period">{entry.period}</p>
                                        {entry.context?.map(context => <p className="experience-context" key={context}>{context}</p>)}
                                    </div>

                                    <div className="experience-details">
                                        <h3>{entry.role}</h3>
                                        <p className="experience-organization">{entry.organization}</p>
                                        {entry.organizationDetail && <p className="experience-organization-detail">{entry.organizationDetail}</p>}

                                        {entry.highlights && (
                                            <ul className="experience-highlights">
                                                {entry.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}
                                            </ul>
                                        )}

                                        {entry.description && (
                                            <div className="experience-description">
                                                {entry.description.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                                            </div>
                                        )}

                                        {entry.tags && (
                                            <div className="experience-toolkit">
                                                <p className="experience-tag-label">{entry.tagLabel ?? "Tools"}</p>
                                                <ul className="experience-tags" aria-label={`${entry.organization} ${entry.tagLabel ?? "tools"}`}>
                                                    {entry.tags.map(tag => <li key={tag}>{tag}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>
                ))}
            </div>

            <footer className="experience-footer">
                <Sparkle aria-hidden="true" />
                <p>Always learning, always building.</p>
            </footer>
        </section>
    );
}
