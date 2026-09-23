# Kvadrat360

Platforma za 360° virtuelne ture nekretnina — [kvadrat360.com](https://kvadrat360.com).

Next.js (App Router) · TypeScript · Supabase · Cloudflare R2 · Pannellum · Google Gemini · Vercel.

## Pokretanje

```bash
npm install
npm run dev        # http://localhost:3000
```

Potreban je `.env.local` — spisak promenljivih (samo imena) je u
[`docs/ai-agent-uvod.md`](docs/ai-agent-uvod.md), §11.

## Korisne komande

| Komanda | Šta radi |
|---|---|
| `npm run build` | produkcijski build (isto što radi Vercel) |
| `npx tsc --noEmit -p .` | provera tipova |
| `npm run db:types` | obnavlja `types/supabase.ts` iz baze — posle svake migracije |

## Dokumentacija

- [`docs/ai-agent-uvod.md`](docs/ai-agent-uvod.md) — kako je sistem složen, pravila rada, recepti
- [`docs/uputstvo-kreiranje-ture.md`](docs/uputstvo-kreiranje-ture.md) — kako se pravi tura, korak po korak
- `supabase/migrations/` — SQL migracije (pokreću se ručno u Supabase SQL editoru)
