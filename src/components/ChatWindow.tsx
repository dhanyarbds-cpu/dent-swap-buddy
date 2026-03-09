import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, IndianRupee, Check, CheckCheck, ShieldAlert, Flag, Ban, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportUserDialog from "@/components/ReportUserDialog";
import NegotiationHeader from "@/components/NegotiationHeader";
import { useToast } from "@/hooks/use-toast";

interface ChatWindowProps {
  chatRequestId: string;
  otherUserId: string;
  otherUserName: string;
  listingTitle: string;
  listingId?: string;
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

// Scam/safety detection patterns
const SUSPICIOUS_PATTERNS = [
  { pattern: /\b(otp|one.?time.?password)\b/i, warning: "Never share your OTP with anyone." },
  { pattern: /\b(bank\s*account|account\s*number|ifsc|neft|rtgs)\b/i, warning: "Don't share bank account details in chat." },
  { pattern: /\b(upi\s*pin|atm\s*pin|cvv|card\s*number|credit\s*card|debit\s*card)\b/i, warning: "Never share payment credentials." },
  { pattern: /\b(advance\s*payment|pay\s*(me\s*)?first|send\s*money\s*first|transfer\s*(amount|money)\s*first)\b/i, warning: "Avoid advance payments to unknown sellers." },
  { pattern: /(bit\.ly|tinyurl|goo\.gl|short\.io|rb\.gy|is\.gd)/i, warning: "Suspicious shortened link detected. Be cautious." },
  { pattern: /\b(army|military|government|posted|cantonment)\b.*\b(urgent|quickly|immediately)\b/i, warning: "Possible impersonation scam detected." },
  { pattern: /\b(google\s*pay|phone\s*pe|paytm)\s*(link|screenshot|proof)\b/i, warning: "Verify payments only through the platform." },
  { pattern: /\b(qr\s*code|scan\s*(this|my)\s*(qr|code))\b/i, warning: "Don't scan unknown QR codes. Use platform payments." },
  { pattern: /\b(pay\s*extra|overpay|refund\s*the\s*difference)\b/i, warning: "Possible overpayment scam. Be cautious." },
];

function detectSuspiciousContent(text: string): string | null {
  for (const { pattern, warning } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) return warning;
  }
  return null;
}

// Spam detection
function isSpamMessage(content: string, recentMessages: Message[], userId: string): boolean {
  const userRecent = recentMessages.filter(m => m.sender_id === userId).slice(-5);
  // Check for repeated identical messages
  const duplicateCount = userRecent.filter(m => m.content.toLowerCase().trim() === content.toLowerCase().trim()).length;
  if (duplicateCount >= 2) return true;
  // Check for very short repetitive messages like "hi" "hello"
  if (content.trim().length <= 3 && userRecent.filter(m => m.content.trim().length <= 3).length >= 3) return true;
  return false;
}

const PRESET_MESSAGES = [
  "Is this still available?",
  "What is the final price?",
  "Can you share more photos?",
  "Where is the pickup location?",
  "What's the condition of the item?",
];

const SAFETY_BANNER = "Never share OTP, bank details, or make advance payments outside the platform.";

const ChatWindow = ({ chatRequestId, otherUserId, otherUserName, listingTitle, listingId, onBack }: ChatWindowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showPriceOffer, setShowPriceOffer] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [priceOffer, setPriceOffer] = useState("");
  const [sending, setSending] = useState(false);
  const [inputWarning, setInputWarning] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
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

  useEffect(() => {
    if (newMessage.length > 5) {
      const warning = detectSuspiciousContent(newMessage);
      setInputWarning(warning);
    } else {
      setInputWarning(null);
    }
  }, [newMessage]);

  const sendMessage = async (type: string = "text", priceAmount?: number) => {
    if (!user) return;
    if (isBlocked) {
      toast({ title: "User blocked", description: "Unblock this user to send messages.", variant: "destructive" });
      return;
    }

    const content = type === "price_offer"
      ? `Offered ₹${priceAmount?.toLocaleString("en-IN")}`
      : type === "price_accepted"
      ? `Accepted price ₹${priceAmount?.toLocaleString("en-IN")}`
      : newMessage.trim();

    if (!content) return;

    // Spam check
    if (type === "text" && isSpamMessage(content, messages, user.id)) {
      toast({ title: "Slow down", description: "Please avoid sending repetitive messages.", variant: "destructive" });
      return;
    }

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
    setShowPresets(false);
    setPriceOffer("");
    setSending(false);
    setInputWarning(null);
  };

  const acceptPrice = async (amount: number) => {
    await sendMessage("price_accepted", amount);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const getMessageWarning = (msg: Message): string | null => {
    if (msg.sender_id === user?.id) return null;
    return detectSuspiciousContent(msg.content);
  };

  const handleBlock = () => {
    setIsBlocked(!isBlocked);
    toast({
      title: isBlocked ? "User unblocked" : "User blocked",
      description: isBlocked ? "You can now receive messages." : "You won't receive messages from this user.",
    });
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
          Offer
        </button>
        {/* More menu: Report + Block */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ReportUserDialog reportedUserId={otherUserId} reportedUserName={otherUserName} listingId={listingId}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 text-destructive">
                <Flag className="h-4 w-4" /> Report User
              </DropdownMenuItem>
            </ReportUserDialog>
            <DropdownMenuItem onClick={handleBlock} className="gap-2">
              <Ban className="h-4 w-4" /> {isBlocked ? "Unblock User" : "Block User"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Negotiation price summary */}
      {user && (
        <NegotiationHeader
          messages={messages}
          userId={user.id}
          otherUserName={otherUserName}
          listingTitle={listingTitle}
        />
      )}

      {/* Safety banner */}
      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 border-b border-amber-200 dark:border-amber-800">
        <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">{SAFETY_BANNER}</p>
      </div>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="flex items-center gap-2 bg-destructive/10 px-4 py-2 border-b border-destructive/20">
          <Ban className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-[11px] text-destructive font-medium">You have blocked this user. <button onClick={handleBlock} className="underline">Unblock</button></p>
        </div>
      )}

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
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const isPriceOffer = msg.message_type === "price_offer";
          const isPriceAccepted = msg.message_type === "price_accepted";
          const warning = getMessageWarning(msg);

          return (
            <div key={msg.id}>
              <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
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
              {warning && (
                <div className={`mt-1 flex items-start gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 max-w-[75%]">
                    <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <p className="text-[10px] font-medium text-destructive">{warning}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Preset quick messages */}
      {showPresets && (
        <div className="border-t border-border bg-card px-4 py-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_MESSAGES.map((preset) => (
              <button
                key={preset}
                onClick={() => { setNewMessage(preset); setShowPresets(false); }}
                className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary/80 transition"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input warning */}
      {inputWarning && (
        <div className="flex items-center gap-2 bg-destructive/10 px-4 py-2 border-t border-destructive/20">
          <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-[11px] text-destructive font-medium">{inputWarning}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={`shrink-0 rounded-xl px-2.5 py-2 text-[10px] font-semibold transition ${showPresets ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Quick
          </button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={isBlocked ? "User blocked" : "Type a message..."}
            className="flex-1 rounded-xl"
            disabled={isBlocked}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={sending || !newMessage.trim() || isBlocked}
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
