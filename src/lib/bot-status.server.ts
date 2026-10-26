import { allowRequest } from "@/lib/rate-limit";
import { answerText, botModels } from "@/lib/chatAi";
import type { WorkersAi } from "@/lib/chat.functions";

/**
 * JSON for /api/bot-status: is the AI binding there, and does each model answer?
 * Shows only yes/no and error messages, never secrets. A few calls a minute at most,
 * since every test answer spends the free quota.
 */
export async function botStatus(request: Request, env: unknown): Promise<Response> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  if (!allowRequest(`bot-status:${ip}`, 3, 60_000)) return json({ error: "Wait a minute." }, 429);

  const ai =
    (env as { AI?: WorkersAi } | undefined)?.AI ??
    (globalThis as { __env__?: { AI?: WorkersAi } }).__env__?.AI;
  const models: Record<string, string> = {};
  if (ai) {
    for (const model of botModels()) {
      try {
        const result = await ai.run(model, {
          messages: [{ role: "user", content: "Say hello in Khmer in 3 words." }],
          max_tokens: 30,
        });
        const text = answerText(result);
        models[model] = text
          ? `OK: ${text.slice(0, 80)}`
          : `No text: ${JSON.stringify(result).slice(0, 200)}`;
      } catch (error) {
        models[model] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }
  return json({
    aiConnected: !!ai,
    envFromRequest: !!(env as { AI?: unknown } | undefined)?.AI,
    envFromGlobal: !!(globalThis as { __env__?: { AI?: unknown } }).__env__?.AI,
    models,
  });
}
