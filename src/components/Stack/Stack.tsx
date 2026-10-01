import "./Stack.css";

type StackTool = {
    name: string;
    description: string;
};

type StackSection = {
    id: string;
    title: string;
    columns: 3 | 4;
    tools: StackTool[];
};

const sections: StackSection[] = [
    {
        id: "frontend",
        title: "Frontend",
        columns: 4,
        tools: [
            { name: "React", description: "A JavaScript library for building user interfaces." },
            { name: "Next.js", description: "A React framework for full-stack applications." },
            { name: "Vite", description: "Fast development and builds." },
            { name: "TypeScript", description: "A typed superset of JavaScript." },
            { name: "JavaScript", description: "The programming language of the web." },
            { name: "Tailwind CSS", description: "A utility-first CSS framework." },
            { name: "HTML & CSS", description: "The foundation of the web." },
        ],
    },
    {
        id: "backend",
        title: "Backend & APIs",
        columns: 3,
        tools: [
            { name: "Node.js", description: "A JavaScript runtime for building scalable server-side applications." },
            { name: "Express.js", description: "A minimalist web framework for Node.js." },
            { name: "FastAPI", description: "A modern, high-performance Python framework for APIs." },
            { name: "Python", description: "A versatile programming language for backend development and more." },
            { name: "Kafka", description: "A distributed event streaming platform." },
            { name: "Redis", description: "An in-memory data store for caching and real-time applications." },
        ],
    },
    {
        id: "databases",
        title: "Databases",
        columns: 4,
        tools: [
            { name: "PostgreSQL", description: "A powerful, open source relational database." },
            { name: "MySQL", description: "A reliable and widely used relational database." },
            { name: "MongoDB", description: "A flexible, document-oriented database." },
            { name: "Supabase", description: "An open source backend platform with a PostgreSQL database." },
        ],
    },
    {
        id: "ai",
        title: "AI & Development",
        columns: 3,
        tools: [
            { name: "Machine Learning", description: "Techniques for building intelligent systems." },
            { name: "LLMs", description: "Large language models for natural language understanding and generation." },
            { name: "ChatGPT", description: "An AI assistant for research, ideation, and development." },
            { name: "Claude Code", description: "An AI coding assistant for development workflows." },
            { name: "OpenAI Codex", description: "An AI system for software engineering tasks." },
            { name: "Postman", description: "A platform for API development, testing, and documentation." },
        ],
    },
    {
        id: "workflow",
        title: "Workflow & Deployment",
        columns: 4,
        tools: [
            { name: "Git", description: "A distributed version control system." },
            { name: "GitHub", description: "A platform for hosting and collaborating on code." },
            { name: "Vercel", description: "A platform for deploying modern web applications." },
            { name: "Railway", description: "A cloud platform for deploying and scaling applications." },
        ],
    },
    {
        id: "design",
        title: "Design tools",
        columns: 4,
        tools: [
            { name: "Canva", description: "A design platform for creating visual content." },
            { name: "Figma", description: "A collaborative interface design tool." },
            { name: "Photoshop", description: "A professional tool for photo and graphic design." },
            { name: "Draw.io", description: "A diagramming tool for creating flowcharts and system diagrams." },
            { name: "Balsamiq", description: "A wireframing tool for quick and simple prototypes." },
        ],
    },
];

export default function Stack() {
    return (
        <section className="stack" aria-labelledby="stack-heading">
            <header className="stack-header">
                <p className="stack-eyebrow">My toolbox</p>
                <h1 id="stack-heading">Stack.</h1>
                <p>The tools I use to build, design, and ship.</p>
            </header>

            {sections.map((section, index) => (
                <section className={`stack-section stack-section--${section.id}`} key={section.id} aria-labelledby={`stack-${section.id}`}>
                    <h2 className="stack-section-heading" id={`stack-${section.id}`}>
                        <span className="stack-section-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                        <span>{section.title}</span>
                    </h2>

                    <ul className={`stack-grid stack-grid--${section.columns}`} role="list">
                        {section.tools.map(tool => (
                            <li className="stack-tool" key={tool.name}>
                                <h3>{tool.name}</h3>
                                <p>{tool.description}</p>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            <footer className="stack-footer">Always exploring. Always learning.</footer>
        </section>
    );
}
