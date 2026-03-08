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
    "search.listening": "Listening...",
    "search.noResults": "No results found",
    "search.tryDifferent": "Try different keywords or adjust filters",
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
    "chat.title": "DentSwap AI",
    "chat.howCanIHelp": "How can I help you?",
    "chat.askAnything": "Ask about products, orders, payments, or anything else",
    "chat.humanSupport": "Connect to human support",
    "chat.inputPlaceholder": "Ask anything...",
  },
  hi: {
    "nav.home": "होम",
    "nav.search": "खोजें",
    "nav.sell": "बेचें",
    "nav.messages": "संदेश",
    "nav.profile": "प्रोफ़ाइल",
    "search.placeholder": "उपकरण, किताबें, डिवाइस खोजें...",
    "search.listening": "सुन रहे हैं...",
    "search.noResults": "कोई परिणाम नहीं मिला",
    "search.tryDifferent": "अन्य कीवर्ड या फ़िल्टर आज़माएं",
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
    "chat.title": "DentSwap AI",
    "chat.howCanIHelp": "मैं आपकी कैसे मदद कर सकता हूँ?",
    "chat.askAnything": "उत्पादों, ऑर्डर, भुगतान के बारे में पूछें",
    "chat.humanSupport": "मानव सहायता से जुड़ें",
    "chat.inputPlaceholder": "कुछ भी पूछें...",
  },
  ta: {
    "nav.home": "முகப்பு",
    "nav.search": "தேடு",
    "nav.sell": "விற்க",
    "nav.messages": "செய்திகள்",
    "nav.profile": "சுயவிவரம்",
    "search.placeholder": "கருவிகள், புத்தகங்கள் தேடுங்கள்...",
    "search.listening": "கேட்கிறேன்...",
    "search.noResults": "முடிவுகள் இல்லை",
    "search.tryDifferent": "வேறு சொற்கள் முயற்சிக்கவும்",
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
    "chat.title": "DentSwap AI",
    "chat.howCanIHelp": "நான் எப்படி உதவ முடியும்?",
    "chat.askAnything": "பொருட்கள், ஆர்டர்கள் பற்றி கேளுங்கள்",
    "chat.humanSupport": "மனித ஆதரவுடன் இணையுங்கள்",
    "chat.inputPlaceholder": "எதையும் கேளுங்கள்...",
  },
  te: {
    "nav.home": "హోమ్",
    "nav.search": "శోధన",
    "nav.sell": "అమ్మకం",
    "nav.messages": "సందేశాలు",
    "nav.profile": "ప్రొఫైల్",
    "search.placeholder": "పరికరాలు, పుస్తకాలు వెతకండి...",
    "search.listening": "వింటున్నాను...",
    "search.noResults": "ఫలితాలు కనబడలేదు",
    "search.tryDifferent": "వేరే కీవర్డ్‌లు ప్రయత్నించండి",
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
    "chat.title": "DentSwap AI",
    "chat.howCanIHelp": "నేను ఎలా సహాయం చేయగలను?",
    "chat.askAnything": "ఉత్పత్తులు, ఆర్డర్ల గురించి అడగండి",
    "chat.humanSupport": "మానవ మద్దతుతో కనెక్ట్ అవ్వండి",
    "chat.inputPlaceholder": "ఏదైనా అడగండి...",
  },
  kn: {
    "nav.home": "ಮುಖಪುಟ",
    "nav.search": "ಹುಡುಕು",
    "nav.sell": "ಮಾರಾಟ",
    "nav.messages": "ಸಂದೇಶಗಳು",
    "nav.profile": "ಪ್ರೊಫೈಲ್",
    "search.placeholder": "ಉಪಕರಣಗಳು, ಪುಸ್ತಕಗಳನ್ನು ಹುಡುಕಿ...",
    "search.listening": "ಕೇಳುತ್ತಿದ್ದೇನೆ...",
    "settings.language": "ಭಾಷೆ",
    "settings.languageDesc": "ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆ ಆರಿಸಿ",
    "chat.inputPlaceholder": "ಏನನ್ನಾದರೂ ಕೇಳಿ...",
  },
  ml: {
    "nav.home": "ഹോം",
    "nav.search": "തിരയൽ",
    "nav.sell": "വിൽക്കുക",
    "nav.messages": "സന്ദേശങ്ങൾ",
    "nav.profile": "പ്രൊഫൈൽ",
    "search.placeholder": "ഉപകരണങ്ങൾ, പുസ്തകങ്ങൾ തിരയുക...",
    "search.listening": "കേൾക്കുന്നു...",
    "settings.language": "ഭാഷ",
    "settings.languageDesc": "നിങ്ങളുടെ ഇഷ്ട ഭാഷ തിരഞ്ഞെടുക്കുക",
    "chat.inputPlaceholder": "എന്തും ചോദിക്കൂ...",
  },
  mr: {
    "nav.home": "होम",
    "nav.search": "शोधा",
    "nav.sell": "विक्री",
    "nav.messages": "संदेश",
    "nav.profile": "प्रोफाइल",
    "search.placeholder": "उपकरणे, पुस्तके शोधा...",
    "search.listening": "ऐकत आहे...",
    "settings.language": "भाषा",
    "settings.languageDesc": "तुमची पसंतीची भाषा निवडा",
    "chat.inputPlaceholder": "काहीही विचारा...",
  },
  bn: {
    "nav.home": "হোম",
    "nav.search": "অনুসন্ধান",
    "nav.sell": "বিক্রি",
    "nav.messages": "বার্তা",
    "nav.profile": "প্রোফাইল",
    "search.placeholder": "যন্ত্রপাতি, বই খুঁজুন...",
    "search.listening": "শুনছি...",
    "settings.language": "ভাষা",
    "settings.languageDesc": "আপনার পছন্দের ভাষা নির্বাচন করুন",
    "chat.inputPlaceholder": "কিছু জিজ্ঞাসা করুন...",
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
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
];
