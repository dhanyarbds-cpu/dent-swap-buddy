import { Home, MessageSquare, PlusCircle, Megaphone, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/messages", label: "Chats", icon: MessageSquare },
  { path: "/sell", label: "Sell", icon: PlusCircle },
  { path: "/my-ads", label: "My Ads", icon: Megaphone },
  { path: "/profile", label: "Account", icon: User },
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
                <div className="dentzap-gradient dentzap-shadow -mt-5 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-transform active:scale-95">
                  <PlusCircle className="h-7 w-7" />
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
