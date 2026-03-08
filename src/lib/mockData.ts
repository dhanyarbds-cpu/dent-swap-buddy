export interface Listing {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: "New" | "Used";
  brand: string;
  description: string;
  location: string;
  seller: {
    name: string;
    college: string;
    year: string;
    verified: boolean;
    avatar: string;
  };
  images: string[];
  hashtags: string[];
  createdAt: string;
}

export const categories = [
  { name: "Dental Instruments", icon: "🦷", count: 234 },
  { name: "Books & Study Materials", icon: "📚", count: 189 },
  { name: "Laboratory Equipment", icon: "🔬", count: 67 },
  { name: "Phantom Heads", icon: "💀", count: 45 },
  { name: "Dental Kits", icon: "🧰", count: 156 },
  { name: "Handpieces & Rotary", icon: "⚙️", count: 89 },
  { name: "Orthodontic Equipment", icon: "🔧", count: 34 },
  { name: "Endodontic Tools", icon: "🪡", count: 56 },
  { name: "Miscellaneous", icon: "📦", count: 112 },
];

export const listings: Listing[] = [
  {
    id: "1",
    title: "Complete BDS Instrument Kit - 3rd Year",
    price: 4500,
    category: "Dental Kits",
    condition: "Used",
    brand: "GDC",
    description: "Full instrument kit used for one semester. All instruments in excellent condition. Includes sterilization case.",
    location: "Mumbai, Maharashtra",
    seller: { name: "Priya Sharma", college: "GDC Mumbai", year: "Final Year", verified: true, avatar: "" },
    images: [],
    hashtags: ["#DentalInstruments", "#BDSKit", "#GDC"],
    createdAt: "2026-03-07T10:00:00Z",
  },
  {
    id: "2",
    title: "Grossman's Endodontic Practice - 12th Ed",
    price: 350,
    category: "Books & Study Materials",
    condition: "Used",
    brand: "Wolters Kluwer",
    description: "Highlighted but in good condition. No torn pages. Standard textbook for endodontics.",
    location: "Delhi",
    seller: { name: "Arjun Mehta", college: "Maulana Azad Dental", year: "3rd Year", verified: true, avatar: "" },
    images: [],
    hashtags: ["#BDSBooks", "#Endodontics", "#Textbook"],
    createdAt: "2026-03-06T14:30:00Z",
  },
  {
    id: "3",
    title: "NSK Pana Max Handpiece",
    price: 8200,
    category: "Handpieces & Rotary",
    condition: "Used",
    brand: "NSK",
    description: "Used for 6 months. Runs smoothly, well maintained. Comes with original case.",
    location: "Bangalore, Karnataka",
    seller: { name: "Kavya Reddy", college: "SDM Dharwad", year: "Intern", verified: false, avatar: "" },
    images: [],
    hashtags: ["#Handpiece", "#NSK", "#DentalEquipment"],
    createdAt: "2026-03-08T08:15:00Z",
  },
  {
    id: "4",
    title: "Phantom Head with Typodont",
    price: 6000,
    category: "Phantom Heads",
    condition: "Used",
    brand: "Nissin",
    description: "Phantom head with full typodont setup. Good condition. Ideal for pre-clinical practice.",
    location: "Chennai, Tamil Nadu",
    seller: { name: "Rahul Nair", college: "SRM Dental", year: "Final Year", verified: true, avatar: "" },
    images: [],
    hashtags: ["#PhantomHead", "#Typodont", "#PreClinical"],
    createdAt: "2026-03-05T16:45:00Z",
  },
  {
    id: "5",
    title: "Orthodontic Plier Set - 12 Pieces",
    price: 3800,
    category: "Orthodontic Equipment",
    condition: "New",
    brand: "Hu-Friedy",
    description: "Brand new ortho plier set. Bought extra set by mistake. Sealed packaging.",
    location: "Pune, Maharashtra",
    seller: { name: "Sneha Kulkarni", college: "BV Dental Pune", year: "3rd Year", verified: true, avatar: "" },
    images: [],
    hashtags: ["#Orthodontics", "#Pliers", "#NewInstruments"],
    createdAt: "2026-03-07T20:00:00Z",
  },
  {
    id: "6",
    title: "Shafer's Oral Pathology Textbook",
    price: 280,
    category: "Books & Study Materials",
    condition: "Used",
    brand: "Elsevier",
    description: "Well-maintained copy. Some pencil markings. Perfect for exam preparation.",
    location: "Hyderabad, Telangana",
    seller: { name: "Aditya Rao", college: "DCMS Hyderabad", year: "2nd Year", verified: false, avatar: "" },
    images: [],
    hashtags: ["#OralPathology", "#BDSBooks", "#Shafer"],
    createdAt: "2026-03-04T11:00:00Z",
  },
];

export const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

export const timeAgo = (date: string) => {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
};
