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
  "3 days": "៣ ថ្ងៃ",
  "7 days": "៧ ថ្ងៃ",
  "30 days": "៣០ ថ្ងៃ",
  "Recommended for You": "ណែនាំសម្រាប់អ្នក",
  "More items": "កញ្ចប់ និង Pass ផ្សេងៗ",
  "Choose your server": "ជ្រើសរើស Server របស់អ្នក",
  "Cambodia / Global": "កម្ពុជា / Global",
  "Philippines": "ហ្វីលីពីន",
  "Malaysia": "ម៉ាឡេស៊ី",
  "Malaysia / Singapore": "ម៉ាឡេស៊ី / សិង្ហបុរី",
  "Singapore": "សិង្ហបុរី",
  "Vietnam": "វៀតណាម",
  "Indonesia": "ឥណ្ឌូនេស៊ី",
  "No packages available yet.": "មិនទាន់មានកញ្ចប់ទេ",
  "Loading…": "កំពុងទាញទិន្នន័យ…",
  "Coming soon": "នឹងបើកលក់ឆាប់ៗនេះ",
  "We are getting the packages ready. Please come back soon.":
    "យើងកំពុងរៀបចំកញ្ចប់ពេជ្រ សូមត្រឡប់មកវិញឆាប់ៗនេះ",
  "Ask us on Telegram": "សួរយើងតាម Telegram",
  "Sales are paused right now. Please come back soon.":
    "ឥឡូវផ្អាកការលក់សិន សូមត្រឡប់មកវិញឆាប់ៗនេះ",
  "Store is getting ready. Packages open soon.": "ហាងកំពុងរៀបចំ កញ្ចប់ពេជ្រនឹងបើកលក់ឆាប់ៗនេះ",
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
    "យើងផ្ញើ Robux ទៅឈ្មោះ Roblox នេះ យើងមិនសុំលេខសម្ងាត់របស់អ្នកទេ",
  "All rights reserved.": "រក្សាសិទ្ធិគ្រប់យ៉ាង",
  "Fast and safe game top-ups in Cambodia.": "បញ្ចូលពេជ្រហ្គេម រហ័ស និងមានសុវត្ថិភាព នៅកម្ពុជា",
  "1-5 min": "១-៥ នាទី",
  "24 Hours": "២៤ ម៉ោង",
  Menu: "ម៉ឺនុយ",
  "Popular games": "ហ្គេមពេញនិយម",
  "Need help?": "ត្រូវការជំនួយ?",
  "Message us, we reply 24 hours.": "ផ្ញើសារមកយើង យើងឆ្លើយតប ២៤ ម៉ោង",
  "Safe payment": "បង់ប្រាក់សុវត្ថិភាព",
  "We accept": "យើងទទួល",
  "Made in Cambodia": "ផលិតនៅកម្ពុជា",
  Order: "ការកម្មង់",
  "Scan to pay": "ស្កេនដើម្បីបង់ប្រាក់",
  "Preparing KHQR…": "កំពុងរៀបចំ KHQR…",
  "KHQR is not available for this order.": "KHQR មិនអាចប្រើបានសម្រាប់ការកម្មង់នេះទេ",
  "min left": "នាទីទៀត",
  "Scan with ABA, ACLEDA, Wing or any bank app. This page updates by itself once you pay.":
    "ស្កេនជាមួយ ABA, ACLEDA, Wing ឬកម្មវិធីធនាគារណាមួយ ពេលបង់រួច ទំព័រនេះនឹងប្តូរដោយស្វ័យប្រវត្តិ",
  "Secure payment through Bakong, National Bank of Cambodia":
    "បង់ប្រាក់សុវត្ថិភាពតាម Bakong ធនាគារជាតិនៃកម្ពុជា",
  "This QR has expired": "QR នេះផុតកំណត់ហើយ",
  "Get a new QR": "យក QR ថ្មី",
  "Payment received": "បានទទួលការបង់ប្រាក់",
  "Delivered to your account": "បានបញ្ចូលទៅគណនីរបស់អ្នករួចហើយ",
  "Topping up your account now (1-5 minutes)": "កំពុងបញ្ចូលទៅគណនីរបស់អ្នក (១-៥ នាទី)",
  "Contact us": "ទាក់ទងយើង",
  "User verified:": "បានផ្ទៀងផ្ទាត់អ្នកលេង:",
  "UID must be numeric.": "UID ត្រូវតែជាលេខ",
  "User ID must be numeric.": "User ID ត្រូវតែជាលេខ",
  "User ID not found": "រកមិនឃើញ User ID នេះទេ",
  "ID is valid, ready to order": "ID ត្រឹមត្រូវ អាចបញ្ជាទិញបាន",
  "ID format is correct, please double-check it before paying": "ទម្រង់ ID ត្រឹមត្រូវ សូមពិនិត្យម្តងទៀតមុនបង់ប្រាក់",
  "Name check is busy right now. Please try again.": "ការពិនិត្យឈ្មោះរវល់បន្តិច សូមព្យាយាមម្តងទៀត",
  "Phone or Telegram (optional)": "លេខទូរស័ព្ទ ឬ Telegram (មិនដាក់ក៏បាន)",
  "No account needed. We contact you here only if there is a problem with your order.":
    "មិនចាំបាច់មានគណនីទេ យើងទាក់ទងតាមនេះ តែពេលការកម្មង់មានបញ្ហាប៉ុណ្ណោះ",
  "Sign in": "ចូលគណនី",
  "to keep all your orders in one place.": "ដើម្បីរក្សាការកម្មង់ទាំងអស់នៅកន្លែងតែមួយ",
  "Save your order link": "រក្សាទុកតំណការកម្មង់",
  "You ordered without an account. Open this link to see your order status later.":
    "អ្នកកម្មង់ដោយគ្មានគណនី បើកតំណនេះ ដើម្បីមើលស្ថានភាពការកម្មង់ពេលក្រោយ",
  Copy: "ចម្លង",
  Copied: "បានចម្លង",
  "Orders on this device": "ការកម្មង់នៅលើឧបករណ៍នេះ",
  "Order not found": "រកមិនឃើញការកម្មង់នេះទេ",
  "This link is wrong or the order was removed.": "តំណនេះខុស ឬការកម្មង់ត្រូវបានលុប",
  "Back to home": "ត្រឡប់ទៅទំព័រដើម",
  "Player": "អ្នកលេង",
  "Order failed. Contact us and we will help.": "ការកម្មង់បរាជ័យ សូមទាក់ទងយើង យើងនឹងជួយ",
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
