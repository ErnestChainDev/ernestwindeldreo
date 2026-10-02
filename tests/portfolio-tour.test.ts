import assert from "node:assert/strict";
import { test } from "node:test";
import { portfolioTourSteps, tourStepDuration } from "../src/lib/portfolio-tour.ts";

test("the pointing tour covers every page link without storing navigation destinations", () => {
    for (const page of ["projects", "experience", "stack", "certifications", "ask", "typing-test", "playground"]) {
        const step = portfolioTourSteps.find(step => step.id === "nav-" + page);
        assert.ok(step, "Missing navigation explanation: " + page);
        assert.equal(step.menu, true);
    }
    for (const step of portfolioTourSteps) assert.equal("route" in step, false);
});

test("each social and engagement control has its own explanation", () => {
    for (const id of ["github", "linkedin", "facebook", "instagram", "x", "tiktok"].map(social => "social-" + social).concat(["views", "likes", "community", "project-contractlens", "project-learners-ai", "get-in-touch"])) {
        const step = portfolioTourSteps.find(step => step.id === id);
        assert.ok(step, "Missing tour stop: " + id);
        assert.ok(step.message.length > 30);
    }
    assert.equal(new Set(portfolioTourSteps.map(step => step.id)).size, portfolioTourSteps.length);
});

test("reading time covers cursor travel, typing, and a readable pause", () => {
    for (const message of ["", "Short message", ...portfolioTourSteps.map(step => step.message), "A".repeat(1000)]) {
        const duration = tourStepDuration(message);
        assert.ok(duration >= 4800 && duration <= 7000);
        if (message.length < 180) assert.ok(duration > message.length * 22 + 1600);
    }
});
