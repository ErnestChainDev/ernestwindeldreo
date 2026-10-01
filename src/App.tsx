import { useCallback, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import IntroPage from "./pages/IntroPage";
import PortfolioLayout from "./components/PortfolioLayout";
import PortfolioContent from "./components/PortfolioContent";
import { useSiteStats } from "./hooks/useSiteStats";
import "./App.css";

type Screen = "intro" | "loading" | "home";

const PORTFOLIO_ENTERED_KEY = "ewd:portfolio-entered";

function getInitialScreen(): Screen {
  try {
    return sessionStorage.getItem(PORTFOLIO_ENTERED_KEY) === "true"
      ? "home"
      : "intro";
  } catch {
    return "intro";
  }
}

export default function App() {
  const stats = useSiteStats();
  const [screen, setScreen] = useState<Screen>(getInitialScreen);

  const handleEnter = useCallback(() => {
    setScreen("loading");
  }, []);

  const handleLoadingComplete = useCallback(() => {
    try {
      // Remember completion only for this tab's session.
      sessionStorage.setItem(PORTFOLIO_ENTERED_KEY, "true");
    } catch {
      // Navigation still works if browser storage is blocked.
    }

    setScreen("home");
  }, []);

  if (screen === "intro") {
    return <IntroPage onEnter={handleEnter} />;
  }

  if (screen === "loading") {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <PortfolioLayout stats={stats}>
      <PortfolioContent />
    </PortfolioLayout>
  );
}
