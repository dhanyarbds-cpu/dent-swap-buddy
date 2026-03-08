import { useState, useEffect } from "react";
import { Settings, ChevronRight, Package, Heart, Star, Shield, Crown, LogOut, BadgeCheck, ShoppingBag, BarChart3, Bell, HelpCircle, Moon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

const ProfilePage = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [stats, setStats] = useState({ listed: 0, sold: 0, rating: "—" });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { count: listedCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "active");

      const { count: soldCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "sold");

      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("reviewed_user_id", user.id);

      let ratingStr = "—";
      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        ratingStr = `${avg.toFixed(1)} ★`;
      }

      setStats({
        listed: listedCount || 0,
        sold: soldCount || 0,
        rating: ratingStr,
      });
    };
    fetchStats();
  }, [user]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Dental Student";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "DS";
  const college = profile?.college || "Update your college";
  const year = profile?.year_of_study || "";
  const location = profile?.location || "";
  const bio = profile?.bio || "";

  const menuSections = [
    {
      title: "Activity",
      items: [
        { icon: ShoppingBag, label: "My Orders", route: "/orders" },
        { icon: Heart, label: "Wishlist", route: "/wishlist" },
        { icon: MessageSquare, label: "Messages", route: "/messages" },
        { icon: BarChart3, label: "Seller Dashboard", route: "/my-ads" },
        { icon: Package, label: "My Listings", route: "/my-ads" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Crown, label: "Elite Membership", badge: profile?.is_elite ? "Active" : "Upgrade", route: "/elite" },
        { icon: Shield, label: "Verification", badge: profile?.verified ? "Verified" : "Pending", route: "/verification" },
        { icon: Star, label: "Reviews & Ratings", route: "/reviews" },
        { icon: Bell, label: "Notifications", route: "/notification-settings" },
        { icon: Moon, label: "Dark Mode", toggle: true },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & Support", route: "/help" },
        { icon: Settings, label: "Settings", route: "/settings" },
      ],
    },
  ];
        { icon: Bell, label: "Notifications", route: "/notification-settings" },
        { icon: Moon, label: "Dark Mode", toggle: true },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & Support", route: "/help" },
        { icon: Settings, label: "Settings", route: "/settings" },
      ],
    },
  ];

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
                {profile?.is_elite && <Crown className="h-4 w-4 text-amber-300" />}
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
              { label: "Listed", value: String(stats.listed) },
              { label: "Sold", value: String(stats.sold) },
              { label: "Rating", value: stats.rating },
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
                  onClick={() => {
                    if ("toggle" in item && item.toggle) return;
                    if ("route" in item && item.route) navigate(item.route);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 ${
                    i < section.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                    <item.icon className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      item.badge === "Verified" || item.badge === "Active"
                        ? "bg-verified/10 text-verified"
                        : "dentzap-gradient text-primary-foreground"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {"toggle" in item && item.toggle ? (
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                    />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  )}
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
