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

Die Migration [20260713000000_dialed_schema.sql](supabase/migrations/20260713000000_dialed_schema.sql) erstellt Enums, Profile, Bohnen, Equipment, Settings und Shots. Sie enthält Indizes, `updated_at`-Trigger, einen sicheren Auth-Trigger, Ownership-Prüfungen sowie RLS-Policies für jede öffentliche Nutzertabelle. [20260713060000_simple_shot_scoring.sql](supabase/migrations/20260713060000_simple_shot_scoring.sql) ergänzt Score-Version 2, das explizite Starter-Rezept und lockert die Constraints der nun optionalen beziehungsweise historischen Shot-Felder.

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

## Vereinfachtes Shot-Tracking

Der normale Flow besteht aus **Setup**, **Extraktion** und **Bewertung**. Erfasst werden nur noch Bohne, Maschine/Mühle/Sieb, Mahlgrad, Dosis, WDT, Puck Screen, Zeit, finales Gewicht, optionales Stop-Gewicht, 1–5-Bewertung, Sauer-Bitter-Balance, dreistufiges Extraktionsbild, Puck-Zustand und eine optionale Notiz. Maschine, Mühle, Bohne und letzte Rezeptwerte werden sinnvoll vorausgefüllt.

Nicht mehr Teil des Shot-Modells sind Tamp-Ausrichtung, erster Tropfen, Druck, Stärke, detaillierte Flow-Diagnosen, Spritzen, Blonding, Puck-Schäden, Astringenz und die früheren Detailbewertungen für Süße, Säure, Bitterkeit, Körper, Klarheit, Aroma und Nachgeschmack. Die Datenbankspalten bleiben für historische Zeilen erhalten, sind nullable und werden für neue Shots weder geschrieben noch ausgewertet. `src/features/data/normalize.ts` bildet Datenbankzeilen ausdrücklich auf das kleinere App-Domain-Modell ab.

## Score 2

Neue und bearbeitete Shots verwenden `2.0.0-simple`. Der Score ist das gewichtete geometrische Mittel aus Geschmack (50 %), Rezepttreue (35 %), Extraktionsbild (10 %) und automatisch ermittelter Konsistenz (5 %). Geschmack nutzt nur Gesamtbewertung und Balance; Rezepttreue nur Brew Ratio, Zeit und Dosis. Fehlende Teilwerte werden ausgelassen und niemals als null Punkte gewertet. Ein vollständiger Score benötigt Dosis, finales Gewicht, Zeit und mindestens eine Geschmacksangabe; die getrennte Datenabdeckung zeigt transparent, wie belastbar das Ergebnis ist.

## Dial-in-Empfehlungen

Die transparente Regel-Engine erzeugt höchstens eine Hauptänderung. Sie priorisiert gute Shots und Channeling, danach sauer/schnell → feiner, bitter/langsam → gröber, sauer beziehungsweise bitter bei passender Zeit → Zielgewicht anpassen und Dosisänderungen nur bei verletzter Siebkapazität. Ohne Geschmack sind rein technische Tipps als niedrig sicher markiert. Der maschinenspezifische Nachlauf kann zusätzlich ein operatives Stop-Gewicht liefern; Puck-Zustand und entfernte Legacy-Diagnosen lösen keine Rezeptänderung aus.

Ein aktiver Tipp erscheint nach dem Quick Start auf dem Dashboard. Er lässt sich nutzerbezogen wegklicken oder über **Shot mit Tipp starten** übernehmen. Dabei wird genau das betroffene Feld im normalen Wizard markiert; bei einem normalen Start bleibt der Wert unverändert und kann direkt am Feld übernommen oder ausgeblendet werden. Detail- und Bearbeitungsansicht verwenden dieselben drei Shot-Sections aus `src/components/shots/shot-sections.tsx`; Speichern berechnet Score 2 neu und regeneriert die Empfehlung.

## Vercel Deployment

1. Repository in Vercel importieren.
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` und `NEXT_PUBLIC_SITE_URL` für Production und Preview setzen.
3. Die zugehörigen Preview- und Production-URLs in Supabase Auth erlauben.
4. Supabase-Migration vor dem ersten produktiven Login ausführen.
5. Deploy starten; Next.js benötigt keine zusätzliche `vercel.json`.

## Sicherheit

Cookie-basierte Sessions werden über `@supabase/ssr` und Next.js `proxy.ts` aktualisiert. Geschützte Routen und jede Mutation verifizieren Claims serverseitig. RLS begrenzt alle Tabellen auf `auth.uid()`, während Trigger zusätzlich verhindern, dass fremde Bohnen- oder Equipment-IDs indirekt verknüpft werden.
