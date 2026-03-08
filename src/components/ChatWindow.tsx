import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, IndianRupee, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatWindowProps {
  chatRequestId: string;
  otherUserName: string;
  listingTitle: string;
  onBack: () => void;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: string;
  price_amount: number | null;
  is_read: boolean;
  created_at: string;
}

const ChatWindow = ({ chatRequestId, otherUserName, listingTitle, onBack }: ChatWindowProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showPriceOffer, setShowPriceOffer] = useState(false);
  const [priceOffer, setPriceOffer] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_request_id", chatRequestId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${chatRequestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_request_id=eq.${chatRequestId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatRequestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (type: string = "text", priceAmount?: number) => {
    if (!user) return;
    const content = type === "price_offer"
      ? `Offered ₹${priceAmount?.toLocaleString("en-IN")}`
      : type === "price_accepted"
      ? `Accepted price ₹${priceAmount?.toLocaleString("en-IN")}`
      : newMessage.trim();

    if (!content) return;

    setSending(true);
    await supabase.from("chat_messages").insert({
      chat_request_id: chatRequestId,
      sender_id: user.id,
      content,
      message_type: type,
      price_amount: priceAmount ?? null,
    });
    setNewMessage("");
    setShowPriceOffer(false);
    setPriceOffer("");
    setSending(false);
  };

  const acceptPrice = async (amount: number) => {
    await sendMessage("price_accepted", amount);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onBack} className="rounded-full p-1.5 text-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{otherUserName}</p>
          <p className="text-xs text-muted-foreground truncate">{listingTitle}</p>
        </div>
        <button
          onClick={() => setShowPriceOffer(!showPriceOffer)}
          className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
        >
          <IndianRupee className="mr-1 inline h-3 w-3" />
          Offer Price
        </button>
      </header>

      {/* Price offer bar */}
      {showPriceOffer && (
        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          <Input
            type="number"
            value={priceOffer}
            onChange={(e) => setPriceOffer(e.target.value)}
            placeholder="Enter price"
            className="h-9 flex-1 rounded-lg"
          />
          <Button
            size="sm"
            onClick={() => priceOffer && sendMessage("price_offer", parseFloat(priceOffer))}
            className="dentzap-gradient rounded-lg text-primary-foreground"
          >
            Send Offer
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const isPriceOffer = msg.message_type === "price_offer";
          const isPriceAccepted = msg.message_type === "price_accepted";

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isPriceOffer || isPriceAccepted
                    ? "border-2 border-primary/30 bg-primary/5"
                    : isMe
                    ? "dentzap-gradient text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                {isPriceOffer && (
                  <p className="mb-1 text-[10px] font-semibold uppercase text-primary">💰 Price Offer</p>
                )}
                {isPriceAccepted && (
                  <p className="mb-1 text-[10px] font-semibold uppercase text-verified">✅ Price Accepted</p>
                )}
                <p className="text-sm">{msg.content}</p>
                <div className={`mt-1 flex items-center gap-1 text-[10px] ${isMe ? "justify-end text-primary-foreground/60" : "text-muted-foreground"}`}>
                  <span>{formatTime(msg.created_at)}</span>
                  {isMe && (msg.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                </div>
                {isPriceOffer && !isMe && (
                  <Button
                    size="sm"
                    onClick={() => acceptPrice(msg.price_amount!)}
                    className="mt-2 w-full rounded-lg bg-verified text-verified-foreground text-xs"
                  >
                    Accept ₹{msg.price_amount?.toLocaleString("en-IN")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 rounded-xl"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={sending || !newMessage.trim()}
            size="icon"
            className="dentzap-gradient h-10 w-10 rounded-xl text-primary-foreground"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
