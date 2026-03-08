import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Eye, MousePointerClick, MessageSquare, ShoppingCart, TrendingUp, IndianRupee, BarChart3, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface AnalyticsSummary {
  views: number;
  clicks: number;
  messages: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
}

interface DailyData {
  date: string;
  views: number;
  clicks: number;
}

interface ListingPerformance {
  id: string;
  title: string;
  views: number;
  clicks: number;
  messages: number;
  revenue: number;
}

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const SellerAnalyticsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const since = period === "7d" ? new Date(Date.now() - 7 * 86400000).toISOString()
        : period === "30d" ? new Date(Date.now() - 30 * 86400000).toISOString()
        : new Date(0).toISOString();

      const [analyticsRes, ordersRes, listingsRes] = await Promise.all([
        supabase.from("product_analytics").select("*").eq("seller_id", user.id).gte("created_at", since),
        supabase.from("orders").select("*").eq("seller_id", user.id).gte("created_at", since),
        supabase.from("listings").select("id, title, price").eq("seller_id", user.id),
      ]);

      setAnalytics(analyticsRes.data || []);
      setOrders(ordersRes.data || []);
      setListings(listingsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [user, period]);

  const summary = useMemo<AnalyticsSummary>(() => {
    const views = analytics.filter(a => a.event_type === "view").length;
    const clicks = analytics.filter(a => a.event_type === "click").length;
    const messages = analytics.filter(a => a.event_type === "message").length;
    const completedOrders = orders.filter(o => o.status === "completed");
    const purchases = completedOrders.length;
    const revenue = completedOrders.reduce((sum: number, o: any) => sum + (o.seller_payout || 0), 0);
    const conversionRate = views > 0 ? (purchases / views) * 100 : 0;
    return { views, clicks, messages, purchases, revenue, conversionRate };
  }, [analytics, orders]);

  const dailyData = useMemo<DailyData[]>(() => {
    const map = new Map<string, { views: number; clicks: number }>();
    analytics.forEach(a => {
      const date = new Date(a.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      const entry = map.get(date) || { views: 0, clicks: 0 };
      if (a.event_type === "view") entry.views++;
      if (a.event_type === "click") entry.clicks++;
      map.set(date, entry);
    });
    return Array.from(map.entries()).map(([date, data]) => ({ date, ...data }));
  }, [analytics]);

  const listingPerf = useMemo<ListingPerformance[]>(() => {
    return listings.map(l => {
      const listingAnalytics = analytics.filter(a => a.listing_id === l.id);
      const listingOrders = orders.filter(o => o.listing_id === l.id && o.status === "completed");
      return {
        id: l.id,
        title: l.title,
        views: listingAnalytics.filter(a => a.event_type === "view").length,
        clicks: listingAnalytics.filter(a => a.event_type === "click").length,
        messages: listingAnalytics.filter(a => a.event_type === "message").length,
        revenue: listingOrders.reduce((s: number, o: any) => s + (o.seller_payout || 0), 0),
      };
    }).sort((a, b) => b.views - a.views);
  }, [analytics, orders, listings]);

  const pieData = [
    { name: "Views", value: summary.views },
    { name: "Clicks", value: summary.clicks },
    { name: "Messages", value: summary.messages },
    { name: "Sales", value: summary.purchases },
  ].filter(d => d.value > 0);

  const statCards = [
    { label: "Total Views", value: summary.views, icon: Eye, color: "text-blue-500" },
    { label: "Clicks", value: summary.clicks, icon: MousePointerClick, color: "text-primary" },
    { label: "Messages", value: summary.messages, icon: MessageSquare, color: "text-amber-500" },
    { label: "Sales", value: summary.purchases, icon: ShoppingCart, color: "text-emerald-500" },
    { label: "Revenue", value: `₹${summary.revenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-emerald-600" },
    { label: "Conversion", value: `${summary.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 glass-panel border-b border-border">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-base font-bold text-foreground flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Seller Analytics</h1>
            <p className="text-xs text-muted-foreground">Track your performance</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-5">
        {/* Period selector */}
        <div className="flex gap-2">
          {(["7d", "30d", "all"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                period === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2">
              {statCards.map(s => (
                <Card key={s.label} className="glass-card border-border/50">
                  <CardContent className="p-3 text-center">
                    <s.icon className={`mx-auto h-5 w-5 ${s.color} mb-1`} />
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="funnel">Funnel</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                {dailyData.length > 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Daily Traffic</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                          <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="clicks" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No analytics data yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Views and clicks will appear as buyers discover your products</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="products" className="mt-4 space-y-2">
                {listingPerf.length > 0 ? listingPerf.map(lp => (
                  <Card key={lp.id} className="glass-card">
                    <CardContent className="p-3">
                      <p className="text-sm font-semibold text-foreground truncate">{lp.title}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{lp.views}</span>
                        <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{lp.clicks}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{lp.messages}</span>
                        <span className="flex items-center gap-1 text-emerald-500 font-medium"><IndianRupee className="h-3 w-3" />{lp.revenue}</span>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <p className="text-center text-sm text-muted-foreground py-8">No listings yet</p>
                )}
              </TabsContent>

              <TabsContent value="funnel" className="mt-4">
                {pieData.length > 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Engagement Funnel</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {pieData.map((d, i) => (
                          <span key={d.name} className="flex items-center gap-1.5 text-xs">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            {d.name}: {d.value}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">No data to display</p>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default SellerAnalyticsPage;
