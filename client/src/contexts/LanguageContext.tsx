import { createContext, useContext, useState, type ReactNode } from "react";

export type Language = "en" | "yo";

const translations = {
  en: {
    nav_apps: "Apps",
    nav_books: "Books",
    nav_music: "Music",
    nav_art: "Art",
    nav_blog: "Blog",
    nav_contact: "Get in Touch",
    hero_badge: "Official Brand Portfolio",
    hero_headline_1: "Elevate Your World",
    hero_headline_2: "with Elevate360",
    hero_sub: "Apps · Books · Music · Art — one brand, infinite impact.",
    hero_cta_primary: "Explore Products",
    hero_cta_secondary: "Get in Touch",
    section_apps: "Mobile Applications",
    section_books: "Publications",
    section_music: "Music",
    section_art: "Art Studio",
    section_youtube: "Watch on YouTube",
    section_youtube_sub: "Exclusive content, product showcases, and creator insights on the Elevate360 YouTube channel.",
    section_compare: "Compare Our Books",
    section_compare_sub: "Find the right book for your journey — wellness, love, or healthy living.",
    footer_tagline: "Elevate the world, one product at a time.",
    cta_view_channel: "View Full Channel",
    cta_buy_amazon: "Buy on Amazon",
    cta_open_app: "Open App",
    cta_visit_etsy: "Visit Art Studio",
    cta_subscribe: "Subscribe — It's Free",
    press_kit: "Press Kit",
  },
  yo: {
    nav_apps: "Àpèsè",
    nav_books: "Ìwé",
    nav_music: "Orin",
    nav_art: "Ọnà",
    nav_blog: "Àpèjọ",
    nav_contact: "Kàn sí wa",
    hero_badge: "Àpèsè Àmì Ìdánimọ̀",
    hero_headline_1: "Gbé Ayé Rẹ Sókè",
    hero_headline_2: "pẹ̀lú Elevate360",
    hero_sub: "Àpèsè · Ìwé · Orin · Ọnà — ìdílé kan, ipa àìlópin.",
    hero_cta_primary: "Wo Àwọn Ọjà",
    hero_cta_secondary: "Kàn sí wa",
    section_apps: "Àwọn Àpèsè Alagbeka",
    section_books: "Àwọn Ìwé",
    section_music: "Orin",
    section_art: "Ilé Ọnà",
    section_youtube: "Wo lórí YouTube",
    section_youtube_sub: "Àkóónú àkànṣe, àfihàn ọjà, àti ìmọ̀ olùdásílẹ̀ lórí ìkanni YouTube Elevate360.",
    section_compare: "Ṣe Àfiwé Àwọn Ìwé Wa",
    section_compare_sub: "Wá ìwé tó yẹ fún ìrìnàjò rẹ — ìlera, ìfẹ́, tàbí ìgbé ayé àláfíà.",
    footer_tagline: "Gbé ayé sókè, ọjà kan lẹ́yìn ọjà.",
    cta_view_channel: "Wo Ìkanni Pípé",
    cta_buy_amazon: "Ra ní Amazon",
    cta_open_app: "Ṣí Àpèsè",
    cta_visit_etsy: "Ṣèbẹ̀wò Ilé Ọnà",
    cta_subscribe: "Forúkọsílẹ̀ — Ọ̀fẹ́",
    press_kit: "Ìwé Ìgbohunsafẹ́fẹ́",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => translations.en[key],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem("e360_lang") as Language) ?? "en";
  });

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem("e360_lang", l);
  };

  const t = (key: TranslationKey): string => translations[lang][key] ?? translations.en[key];

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
