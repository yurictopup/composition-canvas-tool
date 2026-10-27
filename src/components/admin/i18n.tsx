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
  "Congratulations": "សួស្តី",
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
    "តម្លៃនេះ អតិថិជនឃើញ និងបង់ ចុច រក្សាទុក ប្រើភ្លាម ចុច បិទ ដើម្បីលាក់កញ្ចប់",
  "Couldn't read the price table. Make sure the product_prices table exists in Supabase.":
    "អានតារាងតម្លៃមិនបាន សូមសាកម្តងទៀត",
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
};

export function translate(lang: Lang, s: string) {
  return lang === "km" ? (KM[s] ?? s) : s;
}

export const AdminLangContext = createContext<Lang>("km");

export function useAdminT() {
  const lang = useContext(AdminLangContext);
  return { lang, t: (s: string) => translate(lang, s) };
}
