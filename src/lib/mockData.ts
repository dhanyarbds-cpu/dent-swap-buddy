export interface Listing {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: "New" | "Used";
  brand: string;
  description: string;
  location: string;
  featured?: boolean;
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
  { name: "Dental Instruments", icon: "🦷", count: 189 },
  { name: "Medical Equipment", icon: "🏥", count: 234 },
  { name: "Laboratory Equipment", icon: "🔬", count: 67 },
  { name: "Medical & Dental Books", icon: "📚", count: 312 },
  { name: "Surgical Instruments", icon: "🩺", count: 95 },
  { name: "Diagnostic Devices", icon: "📊", count: 56 },
  { name: "Clinic Furniture", icon: "🪑", count: 78 },
  { name: "Student Equipment", icon: "🎓", count: 45 },
  { name: "Educational Materials", icon: "📝", count: 34 },
];

export const listings: Listing[] = [
  {
    id: "1",
    title: "Complete BDS Instrument Kit - 3rd Year",
    price: 4500,
    category: "Dental Instruments",
    condition: "Used",
    brand: "GDC",
    description: "Full instrument kit used for one semester. All instruments in excellent condition. Includes sterilization case.",
    location: "Mumbai, Maharashtra",
    featured: true,
    seller: { name: "Priya Sharma", college: "GDC Mumbai", year: "Final Year", verified: true, avatar: "" },
    images: [],
    hashtags: ["#DentalInstruments", "#BDSKit", "#GDC"],
    createdAt: "2026-03-07T10:00:00Z",
  },
  {
    id: "2",
    title: "Grossman's Endodontic Practice - 12th Ed",
    price: 350,
    category: "Books",
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
    featured: true,
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
    featured: true,
    seller: { name: "Sneha Kulkarni", college: "BV Dental Pune", year: "3rd Year", verified: true, avatar: "" },
    images: [],
    hashtags: ["#Orthodontics", "#Pliers", "#NewInstruments"],
    createdAt: "2026-03-07T20:00:00Z",
  },
  {
    id: "6",
    title: "Shafer's Oral Pathology Textbook",
    price: 280,
    category: "Books",
    condition: "Used",
    brand: "Elsevier",
    description: "Well-maintained copy. Some pencil markings. Perfect for exam preparation.",
    location: "Hyderabad, Telangana",
    seller: { name: "Aditya Rao", college: "DCMS Hyderabad", year: "2nd Year", verified: false, avatar: "" },
    images: [],
    hashtags: ["#OralPathology", "#BDSBooks", "#Shafer"],
    createdAt: "2026-03-04T11:00:00Z",
  },
  {
    id: "7",
    title: "Dental Chair Unit - Portable",
    price: 25000,
    category: "Medical Equipment",
    condition: "Used",
    brand: "Confident",
    description: "Portable dental chair in working condition. Ideal for camp setups.",
    location: "Kolkata, West Bengal",
    featured: true,
    seller: { name: "Deepak Sen", college: "GDCH Kolkata", year: "MDS 2nd Year", verified: true, avatar: "" },
    images: [],
    hashtags: ["#DentalChair", "#Equipment"],
    createdAt: "2026-03-07T12:00:00Z",
  },
  {
    id: "8",
    title: "Autoclave - Table Top 22L",
    price: 12000,
    category: "Lab Equipment",
    condition: "Used",
    brand: "Equitron",
    description: "Table top autoclave, 22 litre capacity. Serviced recently. Perfect for small clinic setup.",
    location: "Ahmedabad, Gujarat",
    seller: { name: "Meera Patel", college: "GDC Ahmedabad", year: "Intern", verified: true, avatar: "" },
    images: [],
    hashtags: ["#Autoclave", "#LabEquipment"],
    createdAt: "2026-03-06T09:00:00Z",
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
