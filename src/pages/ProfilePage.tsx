import { Settings, ChevronRight, Package, Heart, Star, Shield, Crown, LogOut, BadgeCheck, ShoppingBag, BarChart3, Languages, HelpCircle, Moon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const menuSections = [
  {
    title: "Activity",
    items: [
      { icon: ShoppingBag, label: "My Orders" },
      { icon: Heart, label: "Wishlist", count: 5 },
      { icon: BarChart3, label: "Seller Dashboard" },
      { icon: Package, label: "My Listings", count: 3 },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Crown, label: "Premium Membership", badge: "Upgrade" },
      { icon: Shield, label: "Verification", badge: "Verified" },
      { icon: Star, label: "Reviews & Ratings" },
      { icon: Moon, label: "Dark Mode" },
      { icon: Languages, label: "Language" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "Help & Support" },
      { icon: Settings, label: "Settings" },
    ],
  },
];

const ProfilePage = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Dental Student";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "DS";
  const college = profile?.college || "Update your college";
  const year = profile?.year_of_study || "";
  const location = profile?.location || "";
  const bio = profile?.bio || "";

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 px-4 py-3 backdrop-blur-xl">
        <h1 className="mx-auto max-w-lg text-lg font-bold text-foreground">Account</h1>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Profile Card */}
        <div className="mx-4 mt-4 rounded-3xl dentzap-gradient p-6 dentzap-shadow-lg animate-fade-in">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-primary-foreground/20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20 text-2xl font-bold text-primary-foreground ring-2 ring-primary-foreground/10">
                {initials}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold text-primary-foreground">{displayName}</h2>
                {profile?.verified && <BadgeCheck className="h-5 w-5 text-primary-foreground/80" />}
              </div>
              {profile?.username && (
                <p className="text-xs text-primary-foreground/60">@{profile.username}</p>
              )}
              <p className="text-sm text-primary-foreground/70">{college}{year ? ` · ${year}` : ""}</p>
              {location && <p className="mt-0.5 text-xs text-primary-foreground/50">{location}</p>}
            </div>
          </div>

          {bio && (
            <p className="mt-3 text-xs text-primary-foreground/60 italic leading-relaxed">"{bio}"</p>
          )}

          {/* Stats */}
          <div className="mt-4 flex gap-3">
            {[
              { label: "Listed", value: "0" },
              { label: "Sold", value: "0" },
              { label: "Rating", value: "—" },
            ].map((stat) => (
              <div key={stat.label} className="flex-1 rounded-2xl bg-primary-foreground/10 px-3 py-2.5 text-center backdrop-blur-sm">
                <p className="text-lg font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-[10px] font-medium text-primary-foreground/60">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={() => navigate("/edit-profile")}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-semibold text-primary-foreground backdrop-blur-sm transition hover:bg-primary-foreground/20"
          >
            <Pencil className="h-4 w-4" />
            View & Edit Profile
          </button>
        </div>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <div key={section.title} className="mt-5 mx-4">
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{section.title}</p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card dentzap-card-shadow">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 ${
                    i < section.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                    <item.icon className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                  {"count" in item && item.count !== undefined && (
                    <span className="text-xs text-muted-foreground">{item.count}</span>
                  )}
                  {"badge" in item && item.badge && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      item.badge === "Verified"
                        ? "bg-verified/10 text-verified"
                        : "dentzap-gradient text-primary-foreground"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out */}
        <div className="p-4 mt-2">
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full gap-2 rounded-2xl border-destructive/20 py-5 text-destructive hover:bg-destructive/5"
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
