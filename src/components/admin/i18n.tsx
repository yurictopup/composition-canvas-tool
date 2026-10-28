import { createContext, useContext } from "react";

// Owner dashboard language. Khmer is the default; the top bar can switch to English.
export type Lang = "en" | "km";

const KM: Record<string, string> = {
  // Menu and top bar
  Overview: "ទិដ្ឋភាពទូទៅ",
  Dashboard: "ផ្ទាំងគ្រប់គ្រង",
  Orders: "ការកម្មង់",
  Customers: "អតិថិជន",
  "Cash Flow": "លំហូរសាច់ប្រាក់",
  Prices: "តម្លៃ",
  Store: "ហាង",
  Admin: "គ្រប់គ្រង",
  "Live status": "ស្ថានភាពផ្ទាល់",
  "Paid orders": "បានបង់",
  Pending: "រង់ចាំ",
  Processing: "កំពុងដំណើរការ",
  "Back to Store": "ត្រឡប់ទៅហាង",
  Today: "ថ្ងៃនេះ",
  "7 Days": "7 ថ្ងៃ",
  "30 Days": "30 ថ្ងៃ",
  "All time": "ទាំងអស់",
  Refresh: "ផ្ទុកឡើងវិញ",
  "Keep menu open": "បើកម៉ឺនុយ",
  "Collapse menu": "បង្រួមម៉ឺនុយ",
  "Checking...": "កំពុងពិនិត្យ...",
  "Loading...": "កំពុងទាញទិន្នន័យ...",
  "Owner Control Center": "ផ្ទាំងម្ចាស់ហាង",

  // Order statuses
  pending: "រង់ចាំបង់",
  processing: "ត្រូវបញ្ចូល",
  completed: "បានបញ្ចូលរួច",
  failed: "បរាជ័យ",
  refunded: "បានសងប្រាក់វិញ",

  // Tables
  "Order ID": "លេខការកម្មង់",
  Order: "ការកម្មង់",
  Customer: "អតិថិជន",
  Game: "ហ្គេម",
  Package: "កញ្ចប់",
  "Player ID": "Player ID",
  Price: "តម្លៃ",
  Status: "ស្ថានភាព",
  Date: "កាលបរិច្ឆេទ",
  Update: "ប្តូរស្ថានភាព",
  Delivery: "ការបញ្ចូល",
  Amount: "ចំនួនទឹកប្រាក់",
  "Total Orders": "ការកម្មង់សរុប",
  "Total Spent": "ចំណាយសរុប",
  "Last Order": "ការកម្មង់ចុងក្រោយ",
  orders: "ការកម្មង់",
  customers: "អតិថិជន",
  "Search order, email, player ID": "ស្វែងរក ID ឬ អ៊ីមែល",
  "No orders yet": "មិនទាន់មានការកម្មង់ទេ",
  "No customers yet": "មិនទាន់មានអតិថិជនទេ",
  "No paid orders yet": "មិនទាន់មានការបង់ទេ",

  // Cash flow
  "Total Revenue": "ចំណូលសរុប",
  "Supplier cost": "ថ្លៃដើម",
  "Net profit": "ប្រាក់ចំណេញ",
  "Paid Transactions": "ការបង់ប្រាក់",
  Cost: "ថ្លៃដើម",
  Profit: "ចំណេញ",
  "Cost is an estimate from FazerCards prices on": "ថ្លៃដើមតាម FazerCards ថ្ងៃ",
  "Manual packages (Roblox, FF bundle) have no cost here.": "Roblox និង FF bundle មិនគិតថ្លៃដើម",

  // Overview
  Congratulations: "សួស្តី",
  "Revenue in this period": "ចំណូលក្នុងរយៈពេលនេះ",
  "paid orders": "ការកម្មង់បានបង់",
  "View Sales": "មើលការលក់",
  Statistics: "ស្ថិតិ",
  "Updated just now": "ថ្មីៗនេះ",
  Sales: "ការលក់",
  Revenue: "ចំណូល",
  "Last 7 days": "7 ថ្ងៃចុងក្រោយ",
  "Revenue Growth": "កំណើនចំណូល",
  "Weekly report": "របាយការណ៍ប្រចាំសប្តាហ៍",
  "Compared to last week": "ធៀបនឹងសប្តាហ៍មុន",
  "Revenue Report": "របាយការណ៍ចំណូល",
  "Last 12 months": "12 ខែចុងក្រោយ",
  "Total revenue": "ចំណូលសរុប",
  "Revenue (paid)": "ចំណូល",
  "Unpaid / failed": "មិនទាន់បង់",
  Unpaid: "មិនទាន់បង់",
  "Finance alerts": "ត្រូវពិនិត្យ",
  "Attention needed": "សំខាន់",
  "Pending payments": "រង់ចាំការបង់ប្រាក់",
  "Waiting for Bakong": "រង់ចាំ Bakong",
  "Paid not delivered": "បានបង់ មិនទាន់បញ្ចូល",
  "Needs delivery": "ត្រូវបញ្ចូលពេជ្រ",
  "Failed deliveries": "បញ្ចូលមិនបាន",
  "Check and retry": "សាកម្តងទៀត",
  "All orders": "ការកម្មង់ទាំងអស់",
  "In this period": "ក្នុងរយៈពេលនេះ",
  "Order Statistics": "ស្ថិតិការកម្មង់",
  "total orders": "ការកម្មង់សរុប",
  Paid: "បានបង់",
  "Profit Summary": "សង្ខេបប្រាក់ចំណេញ",
  "Revenue minus FazerCards cost": "ចំណូល ដកថ្លៃដើម",
  "From paid orders": "ពីការបង់ប្រាក់",
  "What FazerCards charges": "ទិញពី FazerCards",
  "Paid orders with no cost": "គ្មានថ្លៃដើម",
  "Manual delivery, check by hand": "ធ្វើដោយដៃ",
  Refunds: "សងប្រាក់វិញ",
  "Money returned": "ប្រាក់ដែលបានសងវិញ",
  "Top Games": "ហ្គេមលក់ដាច់",
  "By paid revenue": "តាមចំណូលដែលបានបង់",
  "View all": "មើលទាំងអស់",
  "Recent Orders": "ការកម្មង់ថ្មីៗ",

  // Prices tab
  "These are the prices customers see and pay. A saved price works for new orders right away. Switch a package off to hide it from sale.":
    "តម្លៃនេះ អតិថិជនឃើញ និងបង់ភ្លាម ចុច បិទ ដើម្បីលាក់កញ្ចប់ ជ្រើសផលិតផល FazerCards ដើម្បីបញ្ចូលពេជ្រស្វ័យប្រវត្តិ",
  "Couldn't read the price table. Make sure the product_prices table exists in Supabase.":
    "អានតារាងតម្លៃមិនបាន សូមសាកម្តងទៀត",
  "Couldn't read the FazerCards picks (package_offers table).":
    "អានផលិតផល FazerCards ដែលបានជ្រើស (តារាង package_offers) មិនបាន",
  "Price (USD)": "តម្លៃ (USD)",
  "FazerCards cost": "ថ្លៃដើម",
  "On sale": "កំពុងលក់",
  On: "បើក",
  Off: "បិទ",
  "Not listed": "មិនទាន់មាន",
  Save: "រក្សាទុក",
  "Saving…": "កំពុងរក្សាទុក…",
  Manual: "ធ្វើដោយដៃ",
  "Below cost": "ខាតដើម",
  "enter a price above $0": "សូមដាក់តម្លៃលើស $0",
  hidden: "លាក់",
  "FazerCards product": "ផលិតផល FazerCards",
  "Add package": "បន្ថែមកញ្ចប់",
  Added: "បានបន្ថែម",
  "New package, e.g. 86": "កញ្ចប់ថ្មី ឧ. 86",
  "Amount is a number, like 86 or 78 + 8": "ចំនួនត្រូវជាលេខ ឧ. 86 ឬ 78 + 8",

  // Sales switch (top of Prices tab)
  "Sales are open": "កំពុងបើកលក់",
  "All sales are hidden": "បានលាក់កញ្ចប់ពេជ្រទាំងអស់",
  "Customers can see packages and order": "អតិថិជនឃើញកញ្ចប់ និងអាចទិញបាន",
  "Customers see Coming soon and cannot order. Paid orders are still delivered.":
    "អតិថិជនឃើញថា នឹងបើកលក់ឆាប់ៗ ហើយទិញមិនបាន ការកម្មង់ដែលបានបង់ហើយ នៅតែបញ្ចូលពេជ្រធម្មតា",
  "Hide all packages": "លាក់កញ្ចប់ទាំងអស់",
  "Open sales": "បើកលក់វិញ",
  "Hide one game only (tap to switch)": "លាក់តែហ្គេមណាមួយ (ចុចដើម្បីបិទ ឬបើក)",
  "The sales switch needs store_settings.sql run in Supabase first.":
    "សូមដំណើរការ store_settings.sql ក្នុង Supabase ជាមុនសិន ទើបប៊ូតុងលាក់កញ្ចប់ដំណើរការ",

  // Stock card
  Stock: "ស្តុក",
  "FazerCards money for auto delivery": "លុយ FazerCards សម្រាប់បញ្ចូលពេជ្រស្វ័យប្រវត្តិ",
  "FazerCards balance": "លុយនៅ FazerCards",
  "Low, please top up": "ជិតអស់ សូមបញ្ចូលលុយ",
  "Ready for auto delivery": "គ្រប់សម្រាប់បញ្ចូលពេជ្រ",
  "Orders waiting": "ត្រូវចំណាយ",
  "orders to deliver": "ការកម្មង់ត្រូវបញ្ចូល",
  Plan: "គម្រោង",
  Expired: "ផុតកំណត់",
  Ends: "ផុត",
  days: "ថ្ងៃ",
  "Top up": "បញ្ចូលលុយ",
  "FazerCards API key is not set": "មិនទាន់ដាក់ FazerCards API key",
  "Couldn't read FazerCards, try Refresh": "អាន FazerCards មិនបាន សូមចុចផ្ទុកឡើងវិញ",
  "Add at least": "ត្រូវបញ្ចូលយ៉ាងតិច",
  "to deliver all waiting orders": "ដើម្បីបញ្ចូលការកម្មង់ទាំងអស់",

  // Images tab
  Images: "រូបភាព",
  Banner: "បដា",
  "Game icons": "រូបហ្គេម",
  "Pass and card pictures": "រូប Pass និង Card",
  "Home banner": "បដាទំព័រដើម",
  "Pick any picture, then drag and zoom it to fit the frame how you like":
    "ជ្រើសរូបណាក៏បាន រួចរំកិល និងពង្រីកបង្រួមឲ្យពេញស៊ុមតាមចិត្ត",
  "Package pictures": "រូបកញ្ចប់ពេជ្រ",
  "All games": "គ្រប់ហ្គេម",
  "No picture yet shows the game currency icon": "បើមិនទាន់ដាក់រូប ហាងបង្ហាញរូបពេជ្រដើម",
  "Place the picture": "កែទីតាំងរូប",
  "Drag to move, zoom to make it bigger or smaller": "អូសដើម្បីរំកិល ពង្រីក ឬបង្រួមរូប",
  "Zoom in": "ពង្រីក",
  "Zoom out": "បង្រួម",
  Zoom: "ទំហំរូប",
  "Fill the frame": "ពេញស៊ុម",
  "Show whole picture": "បង្ហាញរូបទាំងមូល",
  Cancel: "បោះបង់",
  Size: "ទំហំ",
  "New picture": "រូបថ្មី",
  "Change picture": "ប្តូររូប",
  "Use the original": "ដាក់រូបដើមវិញ",
  "Back to the original": "បានដាក់រូបដើមវិញ",
  Saved: "បានរក្សាទុក",
  "Couldn't save the picture": "រក្សាទុករូបមិនបាន",
  "Use a PNG, JPG or WebP picture": "សូមប្រើរូប PNG JPG ឬ WebP",
  "Picture is too big, max 10 MB": "រូបធំពេក យ៉ាងច្រើន 10 MB",

  // Delivery cell
  "Paid by Bakong": "បានបង់តាម Bakong",
  "Check payment": "ពិនិត្យការបង់ប្រាក់",
  "Checking…": "កំពុងពិនិត្យ…",
  Deliver: "បញ្ចូលពេជ្រ",
  "Sending…": "កំពុងផ្ញើ…",
  "Check delivery": "ពិនិត្យការបញ្ចូល",
  Supplier: "អ្នកផ្គត់ផ្គង់",
  "Paid.": "បានបង់ហើយ",
  "Not paid yet.": "មិនទាន់បង់ទេ",
  "Something went wrong.": "មានបញ្ហា សាកម្តងទៀត",
  "Bakong has NOT confirmed this order is paid. Only continue if the customer paid you another way. Buy it from FazerCards now?":
    "Bakong មិនទាន់ឃើញការបង់ទេ បន្តតែបើអតិថិជនបង់តាមផ្លូវផ្សេង ទិញពី FazerCards ឥឡូវ?",
  "Buy this package from FazerCards now? It uses your FazerCards balance.":
    "ទិញពី FazerCards ឥឡូវ? វាកាត់លុយ FazerCards",
  "FazerCards may already have this order (the last try got no answer). Open the FazerCards panel > Orders first. Only continue if this order is NOT there. Buy it again now?":
    "FazerCards ប្រហែលមាន order នេះរួចហើយ (លើកមុនគ្មានចម្លើយ) សូមបើក FazerCards panel > Orders ជាមុន បន្តតែបើរកមិនឃើញ order នេះ ទិញម្តងទៀតឥឡូវ?",
  "Buy again (check first)": "ទិញម្តងទៀត (ពិនិត្យសិន)",

  // 6-digit code check
  "Owner sign-in check": "ផ្ទៀងផ្ទាត់ម្ចាស់ហាង",
  "Could not start the code check.": "មិនអាចចាប់ផ្ដើមពិនិត្យលេខកូដបាន",
  "Open Google Authenticator, tap +, then scan this QR code.":
    "បើក Google Authenticator ចុច + ហើយស្កេន QR នេះ",
  "Can't scan? Enter this key in the app:": "ស្កេនមិនបាន? វាយលេខនេះក្នុង app:",
  "Enter the 6-digit code from the app": "វាយលេខកូដ 6 ខ្ទង់ពី app",
  "Wrong or expired code. Try the new code.": "លេខកូដខុស ឬហួសពេល សាកលេខកូដថ្មី",
  Confirm: "បញ្ជាក់",
  "Sign out": "ចាកចេញ",
};

export function translate(lang: Lang, s: string) {
  return lang === "km" ? (KM[s] ?? s) : s;
}

export const AdminLangContext = createContext<Lang>("km");

export function useAdminT() {
  const lang = useContext(AdminLangContext);
  return { lang, t: (s: string) => translate(lang, s) };
}
