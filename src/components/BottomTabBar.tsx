import { Home, Plus, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/sell", label: "Sell", icon: Plus },
  { path: "/profile", label: "Account", icon: User },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border glass-panel">
      <div className="mx-auto flex h-[var(--tab-bar-height)] max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const isSell = tab.path === "/sell";
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-col items-center gap-0.5 px-6 py-1.5 transition-all duration-200 ${
                isSell
                  ? ""
                  : isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isSell ? (
                <div className="dentzap-gradient -mt-6 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg ring-4 ring-background transition-transform duration-200 active:scale-90 hover:shadow-xl animate-glow-pulse">
                  <Plus className="h-7 w-7" strokeWidth={2.5} />
                </div>
              ) : (
                <>
                  <tab.icon
                    className={`h-[22px] w-[22px] transition-all duration-200 ${isActive ? "scale-105 drop-shadow-[0_0_6px_hsl(260,70%,58%)]" : ""}`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  {isActive && (
                    <div className="absolute -top-0.5 h-[3px] w-5 rounded-full bg-primary glow-primary" />
                  )}
                </>
              )}
              <span className={`text-[10px] font-medium ${isSell ? "mt-0.5 text-primary font-semibold" : ""}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
