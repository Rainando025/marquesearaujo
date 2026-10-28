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

- Property catalog lives in the `properties` table; public reads go through `listProperties` server fn (publishable client), admin writes via browser client under RLS `has_role(admin)`. Why: one source of truth for landing page and admin.
- Property photos go to the private `imoveis` bucket and are stored as long-lived signed URLs, because the workspace blocks public buckets.
- AI recommendations run in `recommendProperties` server fn via Lovable AI Gateway Responses API with structured output; ids are filtered against the catalog. Why: keep key server-side and prevent invented listings.
- Visitor writes (events, leads, recommendation query log) go through server fns using supabaseAdmin with validated input; tables have no anon policies. Why: avoid open public insert policies.
- Site-wide broker data and company logo live in the single-row `settings` table; logo uploads use the private `imoveis` bucket with signed URLs. Why: keep public identity and admin editing on one source of truth. Neighborhoods in `neighborhoods` feed both admin form and site filter.
- Public account creation is disabled in hosted auth settings and the sign-in screen only accepts existing accounts. Why: removing a signup link alone cannot prevent direct registration requests.
