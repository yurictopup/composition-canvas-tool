import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isVerifiedOwner } from "@/lib/owner";

async function requireOwner(context: { supabase: unknown; claims: Record<string, unknown> }) {
  if (!(await isVerifiedOwner(context.supabase, context.claims))) {
    throw new Error("Only the shop owner can do this (sign in with the 6-digit code).");
  }
}

// Small amounts only: this is a trial payment to the owner's own account.
const amount = z.number().min(0.01).max(1);

// Owner-only: a KHQR made with the NBC token, for the /nbc-test page.
export const createNbcTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ amount }))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { createNbcTestQr } = await import("@/lib/nbc-test.server");
    return createNbcTestQr(data.amount);
  });

// Owner-only: ask NBC whether that KHQR was paid, and check what it paid.
export const checkNbcTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ md5: z.string().regex(/^[0-9a-f]{32}$/), amount }))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { checkNbcTestQr } = await import("@/lib/nbc-test.server");
    return checkNbcTestQr(data.md5, data.amount);
  });
