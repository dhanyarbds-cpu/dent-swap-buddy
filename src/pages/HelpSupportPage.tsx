import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, MessageCircle, Bug, Lightbulb, Send, Loader2 } from "lucide-react";
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
  { q: "How do I delete my account?", a: "Contact support through this page and we'll help you with account deletion." },
];

type FeedbackType = "contact" | "bug" | "feedback";

const HelpSupportPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formType, setFormType] = useState<FeedbackType | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSending(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1000));
    toast({ title: "Message sent ✓", description: "We'll get back to you soon." });
    setSubject("");
    setMessage("");
    setFormType(null);
    setSending(false);
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
