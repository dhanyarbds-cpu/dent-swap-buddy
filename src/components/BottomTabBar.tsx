import { Home, Search, PlusCircle, MessageSquare, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/search", label: "Search", icon: Search },
  { path: "/sell", label: "Sell", icon: PlusCircle },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/profile", label: "Profile", icon: User },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex h-[var(--tab-bar-height)] max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const isSell = tab.path === "/sell";
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all duration-200 ${
                isSell
                  ? ""
                  : isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isSell ? (
                <div className="dentzap-gradient dentzap-shadow -mt-4 flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground transition-transform active:scale-95">
                  <PlusCircle className="h-6 w-6" />
                </div>
              ) : (
                <>
                  <tab.icon className={`h-5 w-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                  {isActive && (
                    <div className="absolute -top-0.5 h-0.5 w-6 rounded-full bg-primary" />
                  )}
                </>
              )}
              <span className={`text-[10px] font-medium ${isSell ? "mt-0.5 text-primary" : ""}`}>
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
