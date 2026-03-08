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

const MessagesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [activeChat, setActiveChat] = useState<ChatRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("chat_requests")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (data) {
      // Fetch listing titles and other user profiles
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
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Messages</h1>
          <button className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {!user ? (
          <div className="flex flex-col items-center py-24 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-4 font-semibold text-foreground">Sign in to view messages</p>
            <p className="mt-1 text-sm text-muted-foreground">Login to send and receive negotiation requests.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : chatRequests.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-4 font-semibold text-foreground">No messages yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Start browsing and negotiate on listings!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {chatRequests.map((req) => {
              const isSeller = req.seller_id === user.id;
              const isPending = req.status === "pending";
              const initials = (req.other_name || "U").split(" ").map((n) => n[0]).join("");

              return (
                <div key={req.id} className="px-4 py-3.5">
                  <button
                    onClick={() => req.status === "accepted" && setActiveChat(req)}
                    className={`flex w-full items-center gap-3 text-left ${req.status !== "accepted" ? "cursor-default" : ""}`}
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{req.other_name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          req.status === "accepted" ? "bg-verified/10 text-verified" :
                          req.status === "declined" ? "bg-destructive/10 text-destructive" :
                          "bg-primary/10 text-primary"
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{req.listing_title}</p>
                      {req.offered_price && (
                        <p className="text-xs font-semibold text-primary">Offer: ₹{req.offered_price.toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  </button>

                  {/* Accept/Decline for sellers on pending requests */}
                  {isSeller && isPending && (
                    <div className="mt-2 flex gap-2 pl-15">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptDecline(req.id, "accepted")}
                        className="flex-1 gap-1 rounded-lg bg-verified text-verified-foreground text-xs"
                      >
                        <Check className="h-3 w-3" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcceptDecline(req.id, "declined")}
                        className="flex-1 gap-1 rounded-lg border-destructive/30 text-destructive text-xs"
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
