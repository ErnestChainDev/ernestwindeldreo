import { lazy, Suspense, useCallback, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import IntroPage from "./pages/IntroPage";
import { useSiteStats } from "./hooks/useSiteStats";

const loadPortfolio = () => import("./components/PortfolioApp");
const PortfolioApp = lazy(loadPortfolio);

type Screen = "intro" | "loading" | "home";

const PORTFOLIO_ENTERED_KEY = "ewd:portfolio-entered";

function getInitialScreen(): Screen {
  if (window.location.pathname !== "/") return "home";
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

  const handleEnter = useCallback(() => {
    // Fetch the portfolio while its existing opening animation plays.
    void loadPortfolio();
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
    <Suspense fallback={<main className="loading-screen"><p role="status">Opening portfolio…</p></main>}>
      <PortfolioApp stats={stats} startTour={tourActive} />
    </Suspense>
  );
}
