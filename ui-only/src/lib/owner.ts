export async function isOwnerAccount(db: { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> }): Promise<boolean> {
  const { data, error } = await db.rpc("is_owner_account");
  return !error && data === true;
}
