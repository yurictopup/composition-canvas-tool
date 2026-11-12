import * as React from "react";
import { cn } from "@/lib/utils";
import { BOT_MARKUP } from "./botMarkup";

/* BotLogo — the Yuric Bot head logo, inline SVG; motion lives in bundle.css (.yt-bot). */
export type BotLogoProps = {
  size?: number;
  animated?: boolean;
  stars?: boolean;
  title?: string;
  className?: string;
};
export function BotLogo({
  size = 40,
  animated = true,
  stars = true,
  title = "Yuric Bot",
  className,
}: BotLogoProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const html = React.useMemo(() => BOT_MARKUP.replace(/__/g, `yt${uid}`), [uid]);
  return (
    <svg
      className={cn("yt-bot block shrink-0 overflow-visible", className)}
      data-animated={animated ? "true" : "false"}
      data-stars={stars ? "true" : "false"}
      viewBox="0 -4 120 112"
      width={size}
      height={Math.round((size * 112) / 120)}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
