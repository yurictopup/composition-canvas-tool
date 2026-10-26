import { useEffect, useState, useSyncExternalStore } from "react";

// Storefront language and theme. Kept in a tiny module-level store (not React
// context) because pages call their strings before they render <SiteChrome>.

export type StoreLang = "km" | "en";
export type StoreTheme = "light" | "dark" | "system";

const LANG_KEY = "yt-store-lang";
const THEME_KEY = "yt-store-theme";

let lang: StoreLang = "km";
let theme: StoreTheme = "dark";
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const l = localStorage.getItem(LANG_KEY);
    const t = localStorage.getItem(THEME_KEY);
    if (l === "km" || l === "en") lang = l;
    if (t === "light" || t === "dark" || t === "system") theme = t;
  } catch {
    // private mode: defaults apply
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: the choice just isn't remembered
  }
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  // Stored prefs are read after hydration, so tell the first subscriber.
  queueMicrotask(cb);
  return () => listeners.delete(cb);
}

export function setStoreLang(next: StoreLang) {
  lang = next;
  save(LANG_KEY, next);
  emit();
}

export function setStoreTheme(next: StoreTheme) {
  theme = next;
  save(THEME_KEY, next);
  emit();
}

const KM: Record<string, string> = {
  "Instant delivery in 1-5 minutes": "បញ្ចូលរហ័ស ១-៥ នាទី",
  "Best prices": "តម្លៃល្អបំផុត",
  "Secure payment": "ការបង់ប្រាក់មានសុវត្ថិភាព",
  Support: "ជំនួយ",
  "Sign In": "ចូលគណនី",
  "Sign Out": "ចាកចេញ",
  Guest: "ភ្ញៀវ",
  "Sign in to track your orders": "ចូលគណនីដើម្បីតាមដានការកម្មង់",
  Home: "ទំព័រដើម",
  Orders: "ការកម្មង់",
  "My orders": "ការកម្មង់របស់ខ្ញុំ",
  "Admin dashboard": "ផ្ទាំងគ្រប់គ្រង",
  Owner: "ម្ចាស់ហាង",
  Customer: "អតិថិជន",
  Language: "ភាសា",
  Theme: "ពន្លឺ",
  Light: "ភ្លឺ",
  Dark: "ងងឹត",
  System: "តាមប្រព័ន្ធ",
  Notification: "ការជូនដំណឹង",
  Notifications: "ការជូនដំណឹង",
  New: "ថ្មី",
  "Mark all as read": "សម្គាល់ថាបានអានទាំងអស់",
  "No orders yet": "មិនទាន់មានការកម្មង់ទេ",
  "View all orders": "មើលការកម្មង់ទាំងអស់",
  "Waiting for payment": "រង់ចាំការបង់ប្រាក់",
  "Paid, delivering now": "បានបង់ កំពុងបញ្ចូល",
  Delivered: "បានបញ្ចូលរួច",
  "Delivery failed, contact support": "បញ្ចូលមិនបាន សូមទាក់ទងជំនួយ",
  Refunded: "បានសងប្រាក់វិញ",
  "just now": "ឥឡូវនេះ",
  All: "ទាំងអស់",
  Welcome: "សូមស្វាគមន៍",
  to: "មកកាន់",
  "Pay with": "ទូទាត់តាមរយៈ",
  "Instant top-up - safe and secure": "បញ្ចូលពេជ្របានភ្លាមៗ - ដោយសុវត្ថិភាព",
  Others: "ផ្សេងៗ",
  "Back to games": "ត្រឡប់ទៅហ្គេម",
  "Delivered in 1-5 minutes": "បញ្ចូលក្នុង ១-៥ នាទី",
  "Enter Player ID": "បញ្ចូល Player ID",
  "Choose a package": "ជ្រើសរើសកញ្ចប់ពេជ្រ",
  "Choose a payment method": "ជ្រើសរើសវិធីបង់ប្រាក់",
  "Order summary": "សង្ខេបការបញ្ជាទិញ",
  "Check ID": "ពិនិត្យ ID",
  "Checking…": "កំពុងពិនិត្យ…",
  "Hot Items": "ពេញនិយម",
  "No packages available yet.": "មិនទាន់មានកញ្ចប់ទេ។",
  Game: "ហ្គេម",
  "Player ID": "Player ID",
  Package: "កញ្ចប់",
  Payment: "ការបង់ប្រាក់",
  "Scan with ABA, ACLEDA, Wing or any bank app": "ស្កេនជាមួយ ABA, ACLEDA, Wing ឬកម្មវិធីធនាគារណាមួយ",
  Total: "សរុប",
  "Place Order": "បញ្ជាទិញ",
  "Processing…": "កំពុងដំណើរការ…",
  "Check your Player ID first to order": "សូមពិនិត្យ Player ID ជាមុន ដើម្បីបញ្ជាទិញ",
  "We send Robux to this Roblox username. We never ask for your password.":
    "យើងផ្ញើ Robux ទៅឈ្មោះ Roblox នេះ។ យើងមិនសុំលេខសម្ងាត់របស់អ្នកទេ។",
  "All rights reserved.": "រក្សាសិទ្ធិគ្រប់យ៉ាង។",
  "Fast and safe game top-ups in Cambodia.": "បញ្ចូលពេជ្រហ្គេម រហ័ស និងមានសុវត្ថិភាព នៅកម្ពុជា។",
  "1-5 min": "១-៥ នាទី",
  "24 Hours": "២៤ ម៉ោង",
  Menu: "ម៉ឺនុយ",
  "Popular games": "ហ្គេមពេញនិយម",
  "Need help?": "ត្រូវការជំនួយ?",
  "Need help? Chat with us": "ត្រូវការជំនួយ? ឆាតជាមួយយើង",
  "Message us on Telegram, we reply 24 hours.": "ផ្ញើសារមកយើងតាម Telegram យើងឆ្លើយតប ២៤ ម៉ោង។",
  "We accept": "យើងទទួល",
  "Made in Cambodia": "ផលិតនៅកម្ពុជា",
  "Instant delivery": "បញ្ចូលភ្លាមៗ",
};

export function translate(l: StoreLang, s: string) {
  return l === "km" ? (KM[s] ?? s) : s;
}

export function useStorePrefs() {
  const snap = useSyncExternalStore(
    subscribe,
    () => `${lang}|${theme}`,
    () => "km|dark",
  );
  const [l, th] = snap.split("|") as [StoreLang, StoreTheme];

  const [systemDark, setSystemDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return {
    lang: l,
    theme: th,
    light: th === "light" || (th === "system" && !systemDark),
    t: (s: string) => translate(l, s),
  };
}
