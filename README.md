# Dialed

Dialed ist ein mobile-first Brew Journal für Siebträger-Espresso. Ein Shot wird in drei kurzen Schritten dokumentiert: Setup, Extraktion mit Live-Timer und sensorisches Review. Dashboard, Sweet-Spot-Analyse und nachvollziehbare Dial-in-Hinweise helfen dabei, gute Rezepte reproduzierbar zu machen.

## Techstack

- Next.js 16, React 19, TypeScript und App Router
- Tailwind CSS 4 und shadcn/ui
- React Hook Form und Zod
- Recharts für die Sweet-Spot-Visualisierung
- Supabase Postgres, Supabase Auth und `@supabase/ssr`
- Vitest, Testing Library und Playwright
- Vercel als Hosting-Ziel

## Voraussetzungen

- Node.js 20.9 oder neuer
- npm 10 oder neuer
- ein Supabase-Projekt oder Supabase CLI + Docker für die lokale Datenbank

## Installation

```bash
npm install
cp .env.example .env.local
```

In `.env.local` eintragen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Nur URL und Publishable Key sind öffentlich. Ein Service-Role-Key darf niemals in `NEXT_PUBLIC_*`, Browser-Code oder das Repository gelangen.

## Supabase einrichten

Remote-Projekt verbinden und Migration anwenden:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Alternativ lokal:

```bash
npx supabase start
npx supabase db reset
```

Die Migration [20260713000000_dialed_schema.sql](supabase/migrations/20260713000000_dialed_schema.sql) erstellt Enums, Profile, Bohnen, Equipment, Settings und Shots. Sie enthält Indizes, `updated_at`-Trigger, einen sicheren Auth-Trigger, Ownership-Prüfungen sowie RLS-Policies für jede öffentliche Nutzertabelle.

Aktuelle Datenbanktypen regenerieren:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

## Supabase Auth konfigurieren

Unter **Authentication → URL Configuration** eintragen:

- Site URL lokal: `http://localhost:3000`
- Redirect lokal: `http://localhost:3000/auth/callback`
- Passwort-Reset lokal: `http://localhost:3000/auth/update-password`
- Produktion: `https://deine-domain.de/auth/callback`
- Vercel Preview: `https://*-dein-team.vercel.app/auth/callback`

Im Confirm-Signup-E-Mail-Template kann der Standard-Confirmation-Link verwendet werden. Dialed unterstützt sowohl den PKCE-Code als auch `token_hash` am Callback.

## Entwicklung

```bash
npm run dev
```

Die App läuft danach unter [http://localhost:3000](http://localhost:3000). Neue Produktionsnutzer starten bewusst ohne Demo-Inhalte und erhalten klare Empty States.

Lokale Fixtures können nach dem Anlegen eines Testnutzers explizit geladen werden:

```bash
psql "$DATABASE_URL" -v user_id="UUID_DES_TESTNUTZERS" -f supabase/seed.sql
```

Das Seed-Skript wird nicht automatisch in Produktion ausgeführt.

## Qualitätssicherung

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright benötigt einmalig Browser-Binaries (`npx playwright install chromium`). Der Auth-Smoke-Test läuft ohne echtes Konto; ein vollständiger persistenter E2E-Flow benötigt ein isoliertes Supabase-Testprojekt und dessen Environment Variables.

## Score-Logik

Der Score ist ausdrücklich eine motivierende Heuristik, keine wissenschaftliche Messung. Er startet bei 100 und zieht nachvollziehbare Abweichungen von 28 Sekunden und einem Brew Ratio von 1:1,95 sowie Geschmack, Flow und Puck-Zustand ab. Das Ergebnis wird auf 45–98 begrenzt. Der Client zeigt eine Live-Vorschau; beim Speichern berechnet der Server den Score erneut und ignoriert Clientwerte.

Der Standard-Sweet-Spot liegt bei 25–32 Sekunden und einem Ratio von 1:1,80–1:2,15.

## Dial-in-Empfehlungen

Die Regel-Engine priorisiert sichtbares Channeling vor Mahlgradänderungen. Danach folgen sauer/schnell → feiner, sauer bei normaler Zeit → Temperatur erhöhen, bitter/langsam → gröber, bitter bei hohem Ratio → früher stoppen und hoher Nachlauf → Stop-Ziel vorziehen. Balancierte, stabile Shots werden als Referenz empfohlen. Es gibt keine KI-Abhängigkeit.

## Vercel Deployment

1. Repository in Vercel importieren.
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` und `NEXT_PUBLIC_SITE_URL` für Production und Preview setzen.
3. Die zugehörigen Preview- und Production-URLs in Supabase Auth erlauben.
4. Supabase-Migration vor dem ersten produktiven Login ausführen.
5. Deploy starten; Next.js benötigt keine zusätzliche `vercel.json`.

## Sicherheit

Cookie-basierte Sessions werden über `@supabase/ssr` und Next.js `proxy.ts` aktualisiert. Geschützte Routen und jede Mutation verifizieren Claims serverseitig. RLS begrenzt alle Tabellen auf `auth.uid()`, während Trigger zusätzlich verhindern, dass fremde Bohnen- oder Equipment-IDs indirekt verknüpft werden.
