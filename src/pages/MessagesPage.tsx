import { useState, useEffect } from "react";
import { MessageSquare, Search, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ChatWindow from "@/components/ChatWindow";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ChatRequest {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  message: string | null;
  offered_price: number | null;
  created_at: string;
  listing_title?: string;
  other_name?: string;
}

type TabFilter = "all" | "buying" | "selling";

const MessagesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [activeChat, setActiveChat] = useState<ChatRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("all");

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("chat_requests")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (req) => {
          const { data: listing } = await supabase
            .from("listings")
            .select("title")
            .eq("id", req.listing_id)
            .single();

          const otherUserId = req.buyer_id === user.id ? req.seller_id : req.buyer_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", otherUserId)
            .single();

          return {
            ...req,
            listing_title: listing?.title || "Unknown listing",
            other_name: profile?.full_name || "User",
          };
        })
      );
      setChatRequests(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleAcceptDecline = async (requestId: string, status: "accepted" | "declined") => {
    await supabase.from("chat_requests").update({ status }).eq("id", requestId);
    toast({
      title: status === "accepted" ? "Chat opened! 💬" : "Request declined",
      description: status === "accepted" ? "You can now negotiate with the buyer." : undefined,
    });
    fetchRequests();
  };

  const filteredRequests = chatRequests.filter((req) => {
    if (!user) return false;
    if (tab === "buying") return req.buyer_id === user.id;
    if (tab === "selling") return req.seller_id === user.id;
    return true;
  });

  if (activeChat) {
    return (
      <ChatWindow
        chatRequestId={activeChat.id}
        otherUserName={activeChat.other_name || "User"}
        listingTitle={activeChat.listing_title || ""}
        onBack={() => { setActiveChat(null); fetchRequests(); }}
      />
    );
  }

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">Messages</h1>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary transition hover:bg-muted">
            <Search className="h-4 w-4 text-foreground" />
          </button>
        </div>
        {/* Tabs */}
        <div className="mx-auto flex max-w-lg gap-1 px-4 pb-2">
          {(["all", "buying", "selling"] as TabFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all duration-200 ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {!user ? (
          <div className="flex flex-col items-center py-24 text-center px-4 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-4 font-semibold text-foreground">Sign in to view messages</p>
            <p className="mt-1 text-sm text-muted-foreground">Login to send and receive negotiation requests.</p>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-4">
            {[1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-4 dentzap-card-shadow">
                <div className="h-12 w-12 skeleton rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 skeleton" />
                  <div className="h-2.5 w-40 skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-4 font-semibold text-foreground">No messages yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Start browsing and negotiate on listings!</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredRequests.map((req, i) => {
              const isSeller = req.seller_id === user.id;
              const isPending = req.status === "pending";
              const initials = (req.other_name || "U").split(" ").map((n) => n[0]).join("");

              return (
                <div
                  key={req.id}
                  className="animate-fade-in overflow-hidden rounded-2xl border border-border bg-card dentzap-card-shadow"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <button
                    onClick={() => req.status === "accepted" && setActiveChat(req)}
                    className={`flex w-full items-center gap-3 p-4 text-left transition-colors ${
                      req.status === "accepted" ? "hover:bg-secondary/50" : "cursor-default"
                    }`}
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-sm">{req.other_name}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          req.status === "accepted" ? "bg-verified/10 text-verified" :
                          req.status === "declined" ? "bg-destructive/10 text-destructive" :
                          "bg-primary/10 text-primary"
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{req.listing_title}</p>
                      {req.offered_price && (
                        <p className="mt-0.5 text-xs font-semibold text-primary">Offer: ₹{req.offered_price.toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  </button>

                  {isSeller && isPending && (
                    <div className="flex gap-2 border-t border-border px-4 py-2.5 bg-secondary/30">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptDecline(req.id, "accepted")}
                        className="flex-1 gap-1 rounded-xl bg-verified text-verified-foreground text-xs hover:bg-verified/90"
                      >
                        <Check className="h-3 w-3" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcceptDecline(req.id, "declined")}
                        className="flex-1 gap-1 rounded-xl border-destructive/30 text-destructive text-xs hover:bg-destructive/5"
                      >
                        <X className="h-3 w-3" /> Decline
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MessagesPage;
