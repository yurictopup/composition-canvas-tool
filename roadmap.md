# Roadmap

- [x] Add game category tabs below the home banner in Yuric Topup's blue-white style, keeping existing game artwork and links.

- [x] Real email login/signup via Lovable Cloud (email-only, no profile data); header nav links ហ្គេម/ប្រវត្តិ replaced by session-aware ចូលគណនី/ចេញ; verified real signup returns check-email confirmation


- [x] Remove all three instruction boxes and payment-method strip shown in the uploaded home-page screenshot; verified banner and twelve games remain

- [x] Add Genshin Impact and Honkai: Star Rail to reach twelve games, with UID and Server selection; verified on desktop and mobile, lookup and purchases remain unavailable until supported

- [x] Blue → white gradient colour pass (chosen palette #0a1a3f → #1e40af → #60a5fa → #ffffff)
- [x] HOME: real game artwork instead of emoji (6 icons cut from the uploaded strip)
- [x] HOME: 3D look with twinkling/sparkling light effects (style only, no copied text)
- [x] Home page: game tiles only — the diamond/ID/payment block moved off the front page
- [x] Game page /game/$gameId: ID + Zone ID, Check ID, diamond packages, payment, order summary
- [x] Check ID: format check only (4–12 digits); real lookup still needs a supplier API
- [x] Softer hover (lift only, no tilt) and smaller, cleaner tiles; white separator line trimmed off every picture
- [x] Profile page /profile: full-width banner + shop info card + game tiles (no login yet — user's choice)
- [x] Shop name set to "Yuric Topup" (user's answer)
- [x] Game pictures: keep existing artwork; remove PUBG's COMING SOON badge as newly requested
- [x] Layout widened so content spans the screen; banner full width; hero text block removed
- [x] Banner shortened (was 520px tall on desktop, now 300px; profile 210px)
- [x] Home banner resized to the latest reference: compact, centered, 3:1 artwork with side margins
- [x] Latest banner adjustment: span the game section width following the red-box reference, with games moved below
- [x] Real Telegram handle confirmed: @Yuricccc (updated in footer + chat widget)
- [ ] User to confirm: real prices, the "1–3 minutes" claim, and the chat bot's FAQ answers (currently placeholders I wrote)
- [x] Add CODM, Wild Rift, Blood Strike, Clash of Clans with game-specific ID fields and artwork
- [x] Per-game real denominations for all games (MLBB/FF/PUBG/HoK/Magic Chess/CODM/Wild Rift/Blood Strike/COC/Genshin/Star Rail); Roblox stays package-less
- [ ] Real prices per package — user will supply them; packages show "—" and buying stays disabled until priced
- [x] Configure game-specific ID fields and honest Check ID unavailable states for all ten games; purchases require real verification
- [ ] Real account-name Check ID — needs supported providers and credentials; do not treat format checks as verified accounts
- [x] Check ID now asks GamesDrop for the in-game name (server-side). Turns on per game once GAMESDROP_API_TOKEN and GAMESDROP_OFFER_IDS secrets are set; games without an offer keep showing "not available"
- [ ] Re-check the player name on the server when an order is placed and store it on the order (after the order-security change lands)
- [ ] Avatar picture for the profile — user has none yet, "YT" placeholder in place
- [x] Yuric Bot chat widget: iron-bot avatar, sky-blue/white style, FAQ threads (no persistence), Telegram @Yuricccc button; verified in preview
