import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, MessageCircle, Bug, Lightbulb, Send, Loader2, Bot, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const faqs = [
  { q: "How do I post a product?", a: "Tap the '+' button on the bottom tab bar, select a category, add photos and details, then publish your listing." },
  { q: "How does the negotiation system work?", a: "When viewing a listing, tap 'Make Offer' to send a price proposal to the seller. They can accept, reject, or counter-offer." },
  { q: "What is Elite Membership?", a: "Elite gives you priority notifications when products you want become available, advanced search alerts, and a premium badge on your profile." },
  { q: "How do I verify my profile?", a: "Go to Account → Verification. You can verify your email and phone number to get a verified badge." },
  { q: "Is my payment information secure?", a: "We don't store any payment details. All transactions are handled through secure third-party gateways." },
  { q: "How do I raise a complaint?", a: "Go to My Orders, find the order, and tap 'Complaint'. Fill in the details and submit. The seller will be notified." },
  { q: "What is the platform commission?", a: "A small commission of 1.5–2% is charged on successful sales above ₹100. You can see the exact breakdown in your earnings dashboard." },
  { q: "How do I delete my account?", a: "Contact support through this page and we'll help you with account deletion." },
];

type FeedbackType = "contact" | "bug" | "feedback";
type ChatMsg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

const HelpSupportPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formType, setFormType] = useState<FeedbackType | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // AI Chatbot state
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast({ title: "Message sent ✓", description: "We'll get back to you soon." });
    setSubject("");
    setMessage("");
    setFormType(null);
    setSending(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    const allMessages = [...chatMessages, userMsg];
    setChatMessages(allMessages);
    setChatInput("");
    setChatLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Service unavailable" }));
        throw new Error(err.error || "Failed to get response");
      }

      if (!resp.body) throw new Error("No response stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setChatMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again or contact support directly." }]);
    }
    setChatLoading(false);
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Help & Support</h1>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-6">
        {/* AI Chatbot Card */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">AI Support Assistant</p>
                <p className="text-[11px] text-muted-foreground">Get instant answers to your questions</p>
              </div>
            </div>
            <Button
              variant={showChatbot ? "outline" : "default"}
              size="sm"
              onClick={() => setShowChatbot(!showChatbot)}
              className="rounded-xl text-xs"
            >
              {showChatbot ? "Close" : "Chat Now"}
            </Button>
          </div>

          {showChatbot && (
            <div className="animate-fade-in space-y-3">
              {/* Chat messages */}
              <div className="max-h-80 overflow-y-auto rounded-xl bg-background border border-border p-3 space-y-2">
                {chatMessages.length === 0 && (
                  <div className="text-center py-6">
                    <Bot className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-xs text-muted-foreground">Ask me anything about DentSwap!</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                      {["How do I sell?", "Payment safety?", "Raise complaint"].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setChatInput(q); }}
                          className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-foreground hover:bg-secondary/80"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && !chatMessages.find((m, i) => i === chatMessages.length - 1 && m.role === "assistant") && (
                  <div className="flex justify-start">
                    <div className="rounded-xl bg-secondary px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat input */}
              <div className="flex items-center gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  placeholder="Type your question..."
                  className="flex-1 rounded-xl text-xs h-9"
                />
                <Button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Safety Notice */}
        <div className="flex items-start gap-2.5 rounded-2xl bg-verified/5 border border-verified/20 p-3.5">
          <ShieldCheck className="h-5 w-5 text-verified shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Marketplace Protection Active</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Our platform actively monitors seller behavior. Sellers who repeatedly violate rules will be permanently removed.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: MessageCircle, label: "Contact Us", type: "contact" as FeedbackType },
            { icon: Bug, label: "Report Bug", type: "bug" as FeedbackType },
            { icon: Lightbulb, label: "Feedback", type: "feedback" as FeedbackType },
          ].map((action) => (
            <button
              key={action.type}
              onClick={() => setFormType(formType === action.type ? null : action.type)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
                formType === action.type
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card dentzap-card-shadow"
              }`}
            >
              <action.icon className={`h-6 w-6 ${formType === action.type ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-semibold text-foreground">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Form */}
        {formType && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3 dentzap-card-shadow animate-fade-in">
            <h3 className="text-sm font-bold text-foreground">
              {formType === "contact" ? "Contact Support" : formType === "bug" ? "Report a Problem" : "Share Feedback"}
            </h3>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="rounded-xl"
              maxLength={100}
            />
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or feedback..."
              rows={4}
              className="rounded-xl"
              maxLength={1000}
            />
            <Button
              onClick={handleSubmit}
              disabled={sending}
              className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-primary-foreground"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : "Submit"}
            </Button>
          </div>
        )}

        {/* FAQ */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">FAQ</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card dentzap-card-shadow">
            {faqs.map((faq, i) => (
              <div key={i} className={i < faqs.length - 1 ? "border-b border-border" : ""}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="flex-1 text-sm font-medium text-foreground">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {openFaq === i && (
                  <p className="px-4 pb-3.5 text-sm text-muted-foreground animate-fade-in">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HelpSupportPage;
