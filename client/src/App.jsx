import { Route, Routes, useLocation, Link } from "react-router-dom";
import { Dumbbell } from "lucide-react";

import { Onboarding } from "./components/Onboarding";
import { NAV_ITEMS, SeasonPopups } from "./components/Popups";
import { useSession } from "./lib/storage";
import HomePage from "./pages/HomePage";
import StatsPage from "./pages/StatsPage";
import RankingPage from "./pages/RankingPage";
import ChallengesPage from "./pages/ChallengesPage";
import HistoryPage from "./pages/HistoryPage";
import AvatarPage from "./pages/AvatarPage";

function NotFound() {
  return (
    <div className="py-20 text-center space-y-4">
      <p className="font-heading text-3xl font-bold">404</p>
      <p className="text-muted-foreground">Diese Seite gibt's nicht.</p>
      <Link to="/" className="text-primary font-medium hover:underline">
        Zurück zum Training
      </Link>
    </div>
  );
}

function Layout({ userName, onSignOut }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">FitPro</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
        <Routes>
          <Route path="/" element={<HomePage userName={userName} />} />
          <Route path="/stats" element={<StatsPage userName={userName} />} />
          <Route path="/ranking" element={<RankingPage userName={userName} />} />
          <Route path="/challenges" element={<ChallengesPage userName={userName} />} />
          <Route path="/history" element={<HistoryPage userName={userName} onSignOut={onSignOut} />} />
          <Route path="/avatar" element={<AvatarPage userName={userName} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border">
        <div className="max-w-2xl mx-auto flex justify-around py-2">
          {NAV_ITEMS.map(({ path, Icon, label }) => {
            const active = pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[11px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  const [session, signIn, signOut] = useSession();

  if (!session) return <Onboarding onConfirm={signIn} />;

  return (
    <>
      <Layout userName={session.userName} onSignOut={signOut} />
      <SeasonPopups />
    </>
  );
}
