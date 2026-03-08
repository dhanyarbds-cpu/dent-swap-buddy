import { Settings, ChevronRight, Package, Heart, Star, Shield, LogOut, BadgeCheck, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { icon: Package, label: "My Listings", count: 3 },
  { icon: Heart, label: "Wishlist", count: 5 },
  { icon: Star, label: "Reviews" },
  { icon: Shield, label: "Verification", badge: "Verified" },
  { icon: Crown, label: "Elite Pass", badge: "Upgrade" },
  { icon: Settings, label: "Settings" },
];

const ProfilePage = () => {
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Dental Student";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "DS";
  const college = profile?.college || "Update your college";
  const year = profile?.year_of_study || "";
  const location = profile?.location || "";

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-lg">
        <h1 className="mx-auto max-w-lg text-lg font-bold text-foreground">Profile</h1>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Profile Card */}
        <div className="mx-4 mt-4 rounded-2xl dentzap-gradient p-5 dentzap-shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/20 text-2xl font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold text-primary-foreground">{displayName}</h2>
                {profile?.verified && <BadgeCheck className="h-5 w-5 text-primary-foreground/80" />}
              </div>
              <p className="text-sm text-primary-foreground/70">{college}{year ? ` · ${year}` : ""}</p>
              {location && <p className="mt-0.5 text-xs text-primary-foreground/50">{location}</p>}
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            {[
              { label: "Listed", value: "0" },
              { label: "Sold", value: "0" },
              { label: "Bought", value: "0" },
            ].map((stat) => (
              <div key={stat.label} className="flex-1 rounded-xl bg-primary-foreground/10 px-3 py-2 text-center">
                <p className="text-lg font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-[10px] text-primary-foreground/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Menu */}
        <div className="mt-4 mx-4 overflow-hidden rounded-2xl border border-border bg-card">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 ${
                i < menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-xs text-muted-foreground">{item.count}</span>
              )}
              {item.badge && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  item.badge === "Verified"
                    ? "bg-verified/10 text-verified"
                    : "dentzap-gradient text-primary-foreground"
                }`}>
                  {item.badge}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Sign Out */}
        <div className="p-4">
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
