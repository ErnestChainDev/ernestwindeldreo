import { ArrowUpRight } from "lucide-react";
import computerHardware from "../../assets/certificates/cisco/computer-hardware-basics.png";
import operatingSystems from "../../assets/certificates/cisco/operating-system-basics.png";
import endpointSecurity from "../../assets/certificates/cisco/endpoint-security.png";
import backendDevelopment from "../../assets/certificates/coursera/developing-backend-appwith-nodejs&express.jpg";
import softwareEngineer from "../../assets/certificates/internship/Software-Engineer-HTTPE.png";
import promptEngineering from "../../assets/certificates/sololearn/Prompt Engineering.png";
import introductionToLlms from "../../assets/certificates/sololearn/Introduction to LLMs.png";
import webDevelopment from "../../assets/certificates/sololearn/Web Development.png";
import javascriptIntermediate from "../../assets/certificates/sololearn/JavaScript Intermediate.png";
import introductionToJavascript from "../../assets/certificates/sololearn/Intoduction to JavaScript.png";
import introductionToPython from "../../assets/certificates/sololearn/Introduction to Python.png";
import introductionToHtml from "../../assets/certificates/sololearn/Introduction to HTML.png";
import introductionToCss from "../../assets/certificates/sololearn/Introduction to CSS.png";
import "./Certifications.css";

type Certificate = {
    title: string;
    description: string;
    organization?: string;
    image?: string;
};

type CertificateSection = {
    id: string;
    title: string;
    certificates: Certificate[];
};

const sections: CertificateSection[] = [
    {
        id: "cisco",
        title: "Cisco Networking Academy",
        certificates: [
            {
                title: "Computer Hardware Basics",
                description: "Learned the fundamentals of computer hardware components, their functions, and how they work together.",
                image: computerHardware,
            },
            {
                title: "Operating System Basics",
                description: "Gained foundational knowledge of operating systems, including file management, system configuration, and basic administration.",
                image: operatingSystems,
            },
            {
                title: "Endpoint Security",
                description: "Learned the fundamentals of endpoint security, including threat prevention, risk management, and security best practices.",
                image: endpointSecurity,
            },
        ],
    },
    {
        id: "coursera",
        title: "IBM / Coursera",
        certificates: [
            {
                title: "Developing Back-End Apps with Node.js and Express",
                description: "Learned to build scalable back-end applications using Node.js and Express, including routing, middleware, and RESTful APIs.",
                image: backendDevelopment,
            },
        ],
    },
    {
        id: "internships",
        title: "Internship & Apprenticeship",
        certificates: [
            {
                title: "Software Engineer HTTPE",
                organization: "Zetheta Algorithms Private Limited",
                description: "Completed an internship focused on software engineering and web application development.",
                image: softwareEngineer,
            },
            {
                title: "Apprenticeship Certificate",
                organization: "DICT Internship Program",
                description: "Completed an apprenticeship under the DICT Internship Program, gaining practical experience in software development and related technologies.",
            },
        ],
    },
    {
        id: "sololearn",
        title: "Sololearn",
        certificates: [
            {
                title: "Prompt Engineering",
                description: "Learned the fundamentals of prompt engineering for effective AI interactions.",
                image: promptEngineering,
            },
            {
                title: "Introduction to LLMs",
                description: "Explored the fundamentals of large language models and their applications.",
                image: introductionToLlms,
            },
            {
                title: "Web Development",
                description: "Learned the fundamentals of web development, including HTML, CSS, and basic JavaScript concepts.",
                image: webDevelopment,
            },
            {
                title: "JavaScript Intermediate",
                description: "Built on JavaScript fundamentals to learn more advanced concepts and techniques.",
                image: javascriptIntermediate,
            },
            {
                title: "Introduction to JavaScript",
                description: "Learned the basics of JavaScript, including syntax, variables, functions, and control flow.",
                image: introductionToJavascript,
            },
            {
                title: "Introduction to Python",
                description: "Learned the fundamentals of Python, including syntax, data types, and basic programming concepts.",
                image: introductionToPython,
            },
            {
                title: "Introduction to HTML",
                description: "Learned the fundamentals of HTML for creating and structuring web content.",
                image: introductionToHtml,
            },
            {
                title: "Introduction to CSS",
                description: "Learned the fundamentals of CSS for styling and designing web pages.",
                image: introductionToCss,
            },
        ],
    },
];

export default function Certifications() {
    return (
        <section className="certifications" aria-labelledby="certifications-heading">
            <header className="certifications-header">
                <p className="certifications-eyebrow">Continuous learning</p>
                <h1 id="certifications-heading">Certifications.</h1>
                <p>Building knowledge through courses and hands-on training.</p>
            </header>

            {sections.map((section, index) => (
                <section className={`certifications-section certifications-section--${section.id}`} key={section.id} aria-labelledby={`certifications-${section.id}`}>
                    <h2 className="certifications-section-heading" id={`certifications-${section.id}`}>
                        <span className="certifications-section-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                        <span>{section.title}</span>
                    </h2>

                    <ul className={`certifications-list${section.id === "sololearn" ? " certifications-list--grid" : ""}`} role="list">
                        {section.certificates.map(certificate => (
                            <li className="certification" key={certificate.title}>
                                <div className="certification-content">
                                    <h3>{certificate.title}</h3>
                                    {certificate.organization && <p className="certification-organization">{certificate.organization}</p>}
                                    <p className="certification-description">{certificate.description}</p>
                                </div>

                                {certificate.image ? (
                                    <a
                                        className="certification-link"
                                        href={certificate.image}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`View ${certificate.title} certificate (opens in a new tab)`}
                                    >
                                        <span>View certificate</span>
                                        <ArrowUpRight aria-hidden="true" />
                                    </a>
                                ) : (
                                    <span className="certification-unavailable">Image unavailable</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            <footer className="certifications-footer">Always learning. Always growing.</footer>
        </section>
    );
}
