# Unisphere

An online, peer-reviewed, multidisciplinary research journal. Next.js 16 + Tailwind CSS v4 + Supabase.

```bash
npm install
cp .env.example .env.local   # optional in Phase 1: the landing page runs without keys
npm run dev                  # http://localhost:3000
npm run check                # typecheck + lint
```

- Plan, schema, RLS and phases: [`PLAN.md`](./PLAN.md)
- Conventions and design tokens: [`CLAUDE.md`](./CLAUDE.md)
- Journal name / ISSN / DOI prefix: [`src/config/journal.ts`](./src/config/journal.ts)
- Design references: [`design-reference/`](./design-reference)

Status: **Phase 1 done**: scaffold, design system, landing page (static placeholder data), sign-in/register pop-up UI (not yet connected).
