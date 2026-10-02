export type TourStep = { id: string; target: string; message: string; menu?: boolean };

function item(id: string, target: string, message: string, menu = false): TourStep {
    return { id, target, message, menu };
}
function navigation(id: string, message: string): TourStep {
    return item("nav-" + id, '[data-tour="nav-' + id + '"]', message, true);
}

export const portfolioTourSteps: TourStep[] = [
    item("welcome", ".home-hero-copy", "Hi, I’m Ernest. Let me show you around my portfolio."),
    item("avatar", ".home-orbit", "This is me! My avatar looks toward your cursor while the orbital rings stay in place."),
    ...[
        ["github", "GitHub", "Explore my repositories, source code, and what I’m building."],
        ["linkedin", "LinkedIn", "Find my professional profile and connect with me about opportunities."],
        ["facebook", "Facebook", "You can connect with me on Facebook here."],
        ["instagram", "Instagram", "Visit my Instagram profile for more updates."],
        ["x", "X", "Find my profile on X and follow my updates."],
        ["tiktok", "TikTok", "You can also find me on TikTok. Social links open in a new tab."],
    ].map(([id, name, message]) => item("social-" + id, '[data-tour="social-' + id + '"]', name + ": " + message)),
    item("view-projects", '[data-tour="projects"]', "Want to see what I’ve built? This button opens my complete projects collection."),
    navigation("projects", "Here are the projects I’ve built, with live demos, source code, and the tools behind them."),
    navigation("experience", "Explore my internships, project work, leadership, and education here."),
    navigation("stack", "These are the technologies and tools I use to build, design, and ship software."),
    navigation("certifications", "Here are the certifications I’ve earned through courses, training, and internships."),
    navigation("ask", "Have a question about me? Ask Erza, my portfolio assistant. You can also press Alt + Y."),
    navigation("typing-test", "Practice your typing speed and accuracy in English or Filipino. The shortcut is Alt + X."),
    item("community", '[data-tour="community"]', "This little corner brings together the people who have visited my portfolio.", true),
    item("views", '[data-tour="views"]', "This counts portfolio visits. Refreshing during the same browser-tab visit does not add another view.", true),
    item("likes", '[data-tour="likes"]', "Enjoyed the portfolio? Tap the heart to leave a like, or tap it again to remove yours.", true),
    navigation("playground", "Take a break with four mini games and a music player. Your music keeps playing while you play games."),
    item("selected-projects", ".home-projects", "Here’s a preview of my selected projects. Open a card to visit its live website."),
    item("project-contractlens", '[data-tour="project-contractlens"]', "ContractLens helps make smart contracts clearer and easier to understand."),
    item("project-learners-ai", '[data-tour="project-learners-ai"]', "Learners AI explores personalized learning with explainable AI."),
    item("view-all", ".home-view-all", "View all takes you to my full collection of projects, with category filters and more details."),
    item("experience-summary", '[data-tour="experience"]', "These are my recent roles. Open one to learn more about my experience and responsibilities."),
    item("toolkit-summary", '[data-tour="toolkit"]', "A quick look at my toolkit. Each tag opens the complete Stack page."),
    item("get-in-touch", ".home-get-in-touch", "Have a project or opportunity in mind? Get in touch opens my contact details and message form.", true),
    item("contact-button", '[data-tour="contact"]', "You can also reach me from here. Let’s talk about what you’d like to build."),
    item("tour-finish", ".home-tour-reminder", "That’s the tour! Explore at your own pace, or take the tour again whenever you like."),
];

export function tourStepDuration(message: string) {
    return Math.max(4800, Math.min(7000, message.length * 34 + 1600));
}
