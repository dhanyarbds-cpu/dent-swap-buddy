import { useNavigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { ArrowLeft, ShieldCheck, CreditCard, Building2, RotateCcw, Package, Ban, Truck, Loader2 } from "lucide-react";

const adminLinks = [
  { title: "UPI Payment Verification", desc: "Verify pending UPI payments", icon: CreditCard, path: "/admin/upi-verification", accent: "text-primary" },
  { title: "Transactions", desc: "View all platform transactions", icon: CreditCard, path: "/admin/transactions", accent: "text-verified" },
  { title: "Companies", desc: "Manage company registrations", icon: Building2, path: "/admin/companies", accent: "text-primary" },
  { title: "Returns", desc: "Handle return requests", icon: RotateCcw, path: "/returns", accent: "text-amber-500" },
  { title: "Blocked Listings", desc: "View blocked listings", icon: Ban, path: "/admin/blocked-listings", accent: "text-destructive" },
  { title: "Deliveries", desc: "Track all deliveries", icon: Truck, path: "/admin/deliveries", accent: "text-primary" },
];

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminRole();

  if (loading) {
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

      <main className="mx-auto max-w-lg p-4 space-y-3">
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
      </main>
    </div>
  );
};

export default AdminDashboardPage;
