import { useNavigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { ArrowLeft, ShieldCheck, CreditCard, Building2, RotateCcw, Package, Ban, Truck, Loader2, Wallet, Users, Info } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const adminLinks = [
  { title: "UPI Payment Verification", desc: "Verify pending UPI payments", icon: CreditCard, path: "/admin/upi-verification", accent: "text-primary" },
  { title: "Seller Payouts", desc: "Manage seller payout requests", icon: Wallet, path: "/admin/seller-payouts", accent: "text-verified" },
  { title: "Transactions", desc: "View all platform transactions", icon: CreditCard, path: "/admin/transactions", accent: "text-verified" },
  { title: "Companies", desc: "Manage company registrations", icon: Building2, path: "/admin/companies", accent: "text-primary" },
  { title: "Returns", desc: "Handle return requests", icon: RotateCcw, path: "/returns", accent: "text-amber-500" },
  { title: "Blocked Listings", desc: "View blocked listings", icon: Ban, path: "/admin/blocked-listings", accent: "text-destructive" },
  { title: "Deliveries", desc: "Track all deliveries", icon: Truck, path: "/admin/deliveries", accent: "text-primary" },
];

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const queryClient = useQueryClient();

  const { data: totalUsersCount = 0 } = useQuery({
    queryKey: ['total-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!isAdmin) return;
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['total-users-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  if (adminLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <ShieldCheck className="h-16 w-16 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground">You don't have admin privileges.</p>
        <button onClick={() => navigate("/")} className="mt-2 text-sm font-semibold text-primary underline">Go Home</button>
      </div>
    );
  }

  const displayCount = (totalUsersCount * 3).toLocaleString();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-[11px] text-muted-foreground">Manage your platform</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-verified" />
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-muted-foreground">Total Users (x3)</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center justify-center rounded-full outline-none focus:ring-2 focus:ring-primary/50">
                      <Info className="h-4 w-4 text-muted-foreground/70 hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="max-w-[200px] text-xs">This value shows 3 times the actual user count for internal analytics/representation purposes.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="mt-0.5 text-2xl font-bold text-foreground">{displayCount}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {adminLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <link.icon className={`h-5 w-5 ${link.accent}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{link.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{link.desc}</p>
              </div>
              <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
