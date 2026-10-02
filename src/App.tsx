import { useCallback, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import IntroPage from "./pages/IntroPage";
import PortfolioLayout from "./components/PortfolioLayout";
import PortfolioContent from "./components/PortfolioContent";
import PlaygroundMusicProvider from "./components/Playground/PlaygroundMusicProvider";
import HomeTour from "./components/HomeTour";
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
  const [tourActive, setTourActive] = useState(false);
  const [hasToured, setHasToured] = useState(false);
  const handleStartTour = useCallback(() => setTourActive(true), []);
  const handleCloseTour = useCallback(() => {
    setTourActive(false);
    setHasToured(true);
    if (window.location.pathname === "/") {
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".home-tour-trigger")?.focus({ preventScroll: true }));
    }
  }, []);

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

    setTourActive(window.location.pathname === "/");
    setScreen("home");
  }, []);

  if (screen === "intro") {
    return <IntroPage onEnter={handleEnter} />;
  }

  if (screen === "loading") {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <PlaygroundMusicProvider>
      <PortfolioLayout stats={stats}>
        <PortfolioContent tourActive={tourActive} hasToured={hasToured} onStartTour={handleStartTour} />
        {tourActive && <HomeTour onClose={handleCloseTour} />}
      </PortfolioLayout>
    </PlaygroundMusicProvider>
  );
}
