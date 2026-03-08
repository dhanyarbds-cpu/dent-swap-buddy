import { ArrowLeft, ShieldCheck, Scale, AlertTriangle, RotateCcw, CreditCard, Users, Flag, Star, Gavel } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    icon: ShieldCheck,
    title: "Anti-Scam Protection",
    points: [
      "All users must verify their email before accessing the platform.",
      "Sellers must complete identity verification before listing products.",
      "Suspicious messages (OTP requests, bank details, phishing links) trigger real-time warnings.",
      "AI-powered moderation monitors listings for fraudulent or misleading content.",
    ],
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    points: [
      "All payments must go through the in-app payment gateway. Off-platform payments are not supported.",
      "Escrow-style system: buyer's payment is held until delivery is confirmed.",
      "Transparent fee breakdown shown before every transaction.",
      "Platform commission is minimal (1%) and clearly disclosed.",
    ],
  },
  {
    icon: RotateCcw,
    title: "Returns & Refunds",
    points: [
      "Buyers can request returns within 7 days of delivery confirmation.",
      "Photo/video evidence is required for all return requests.",
      "Returned products are verified before refunds are processed.",
      "Users who repeatedly abuse the return system may be restricted.",
    ],
  },
  {
    icon: Scale,
    title: "Fair Treatment for Sellers",
    points: [
      "Listings are never removed without a clear reason and warning first.",
      "Sellers receive notifications explaining any policy violations.",
      "Sellers can edit and fix flagged listings before suspension.",
      "An appeal system is available for any account action or ban.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Account Moderation",
    points: [
      "Accounts are never banned without explanation.",
      "Warning levels: 1st warning → listing fix required, 2nd → temporary restriction, 3rd → review for permanent action.",
      "All moderation decisions can be appealed within 7 days.",
      "Appeal reviews are completed within 48 hours.",
    ],
  },
  {
    icon: Star,
    title: "Review & Rating Integrity",
    points: [
      "Only verified buyers who completed a purchase can leave reviews.",
      "Suspicious review patterns (mass ratings, identical text) are flagged automatically.",
      "Sellers can appeal unfair reviews through the support system.",
    ],
  },
  {
    icon: Users,
    title: "Community Standards",
    points: [
      "Only non-consumable products are allowed. Food, medicines, beverages, and edible items are strictly prohibited.",
      "Harassment, hate speech, and discriminatory behavior result in immediate action.",
      "Respect for all users — both buyers and sellers are treated equally in disputes.",
    ],
  },
  {
    icon: Gavel,
    title: "Dispute Resolution",
    points: [
      "All disputes are reviewed by our moderation team, not automated bots.",
      "Both parties are heard before any decision is made.",
      "Evidence-based resolutions: photos, chat logs, and transaction records are reviewed.",
      "Resolution timeline: within 48–72 hours for standard disputes.",
    ],
  },
];

const PoliciesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Marketplace Policies</h1>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-4">
        {/* Hero */}
        <div className="rounded-2xl dentzap-gradient p-5 dentzap-shadow">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            <div>
              <h2 className="text-base font-bold text-primary-foreground">Your Protection, Our Priority</h2>
              <p className="text-xs text-primary-foreground/70 mt-0.5">
                Fair rules that protect both buyers and sellers equally.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Sections */}
        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-border bg-card p-4 space-y-3 dentzap-card-shadow">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
            </div>
            <ul className="space-y-2">
              {section.points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Appeal CTA */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground">Need to Appeal a Decision?</h3>
          <p className="text-xs text-muted-foreground">
            If you believe an action on your account was unfair, you can submit an appeal through our support system. All appeals are reviewed by our team within 48 hours.
          </p>
          <button
            onClick={() => navigate("/help")}
            className="mt-2 flex items-center gap-2 rounded-xl dentzap-gradient px-4 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            <Flag className="h-3.5 w-3.5" />
            Submit an Appeal
          </button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground pb-4">
          Last updated: March 2026. Policies may be updated periodically.
        </p>
      </main>
    </div>
  );
};

export default PoliciesPage;
