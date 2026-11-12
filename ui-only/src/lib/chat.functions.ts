export async function askBot(_input: {
  data: { turns: { role: string; text: string }[] };
}): Promise<{ text: string; source: "ai" | "orders" } | { unavailable: string }> {
  return { unavailable: "UI demo" };
}

export async function checkMyOrders(): Promise<{ text: string } | { unavailable: string }> {
  return { unavailable: "UI demo" };
}
