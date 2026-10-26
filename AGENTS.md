<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep game-specific identifier configuration and format validation in `src/lib/player-id.ts`, with concrete rule tests; formats are not proof of a real account.
- Render selector-based identifier fields from the options in the player ID configuration; this keeps server choices and validation in one place.
- Games awaiting provider lookup and package data must not inherit another game's packages or enable purchases; this avoids false verification and invented offers.
- Home game categories use the shared Tabs controls and existing game catalog; this keeps filtering accessible without changing game offers.
- Account-name lookups run only on the server (`src/lib/player-lookup.functions.ts`) with the supplier token in a secret; supplier errors or empty answers must never count as a verified account.
