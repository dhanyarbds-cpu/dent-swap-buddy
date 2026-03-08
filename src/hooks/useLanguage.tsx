import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "dentzap-language";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.search": "Search",
    "nav.sell": "Sell",
    "nav.messages": "Messages",
    "nav.profile": "Profile",
    "search.placeholder": "Search equipment, books, devices...",
    "location.label": "Location",
    "location.select": "Select Location",
    "location.detecting": "Detecting...",
    "categories.title": "Browse Categories",
    "categories.seeAll": "See All",
    "feed.title": "Fresh Recommendations",
    "feed.items": "items",
    "feed.noListings": "No listings found",
    "feed.tryCategory": "Try browsing a different category",
    "settings.language": "Language",
    "settings.languageDesc": "Choose your preferred language",
  },
  hi: {
    "nav.home": "होम",
    "nav.search": "खोजें",
    "nav.sell": "बेचें",
    "nav.messages": "संदेश",
    "nav.profile": "प्रोफ़ाइल",
    "search.placeholder": "उपकरण, किताबें, डिवाइस खोजें...",
    "location.label": "स्थान",
    "location.select": "स्थान चुनें",
    "location.detecting": "पता लगा रहे हैं...",
    "categories.title": "श्रेणियाँ ब्राउज़ करें",
    "categories.seeAll": "सभी देखें",
    "feed.title": "नई सिफारिशें",
    "feed.items": "आइटम",
    "feed.noListings": "कोई लिस्टिंग नहीं मिली",
    "feed.tryCategory": "कोई अन्य श्रेणी आज़माएं",
    "settings.language": "भाषा",
    "settings.languageDesc": "अपनी पसंदीदा भाषा चुनें",
  },
  ta: {
    "nav.home": "முகப்பு",
    "nav.search": "தேடு",
    "nav.sell": "விற்க",
    "nav.messages": "செய்திகள்",
    "nav.profile": "சுயவிவரம்",
    "search.placeholder": "கருவிகள், புத்தகங்கள் தேடுங்கள்...",
    "location.label": "இடம்",
    "location.select": "இடத்தைத் தேர்ந்தெடுக்கவும்",
    "location.detecting": "கண்டறிகிறது...",
    "categories.title": "வகைகளை உலாவுக",
    "categories.seeAll": "அனைத்தும் காண்க",
    "feed.title": "புதிய பரிந்துரைகள்",
    "feed.items": "பொருட்கள்",
    "feed.noListings": "பட்டியல்கள் இல்லை",
    "feed.tryCategory": "வேறு வகையை முயற்சிக்கவும்",
    "settings.language": "மொழி",
    "settings.languageDesc": "உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்",
  },
  te: {
    "nav.home": "హోమ్",
    "nav.search": "శోధన",
    "nav.sell": "అమ్మకం",
    "nav.messages": "సందేశాలు",
    "nav.profile": "ప్రొఫైల్",
    "search.placeholder": "పరికరాలు, పుస్తకాలు వెతకండి...",
    "location.label": "స్థానం",
    "location.select": "స్థానాన్ని ఎంచుకోండి",
    "location.detecting": "గుర్తిస్తోంది...",
    "categories.title": "వర్గాలు బ్రౌజ్ చేయండి",
    "categories.seeAll": "అన్నీ చూడండి",
    "feed.title": "కొత్త సిఫార్సులు",
    "feed.items": "ఐటెమ్‌లు",
    "feed.noListings": "లిస్టింగ్‌లు కనబడలేదు",
    "feed.tryCategory": "వేరే వర్గం ప్రయత్నించండి",
    "settings.language": "భాష",
    "settings.languageDesc": "మీ ఇష్టమైన భాషను ఎంచుకోండి",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLang] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "en"; } catch { return "en"; }
  });

  const setLanguage = useCallback((lang: string) => {
    setLang(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations.en?.[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export const AVAILABLE_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
];
