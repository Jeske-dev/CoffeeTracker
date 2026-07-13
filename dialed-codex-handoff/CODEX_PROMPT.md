# Codex-Prompt: „Dialed“ produktionsreif und pixelnah umsetzen

Du bist ein Senior Full-Stack Product Engineer mit sehr starkem Gespür für Design-Implementation. Baue die Web-App **„Dialed“**, einen mobilen Espresso-Extraction-Tracker, vollständig und produktionsreif nach. Arbeite autonom, schreibe echten ausführbaren Code und beende die Aufgabe nicht nach Planung oder Scaffolding.

## 0. Verbindliche Referenzdateien

Bevor du Code schreibst, öffne und analysiere vollständig:

1. `docs/design/dialed/ui-flow-overview.png`
2. `docs/design/dialed/desktop-preview.png`
3. `docs/design/dialed/index.html`
4. `docs/design/dialed/design-tokens.json`
5. `docs/design/dialed/DESIGN_HANDOFF.md`

### Priorität bei Widersprüchen

1. Die beiden PNGs bestimmen visuelle Komposition, Proportionen und Gesamtwirkung.
2. `index.html` bestimmt konkrete Abstände, Größen, Animationen, Interaktionen und UI-Texte.
3. `design-tokens.json` bestimmt Farben, Radien, Schriften und Motion-Tokens.
4. `DESIGN_HANDOFF.md` bestimmt Produktlogik und fachliche Anforderungen.
5. Dieser Prompt bestimmt Architektur, Datenbank, Authentifizierung und Definition of Done.

**Wichtig:** Das Design darf nicht neu interpretiert oder durch ein generisches Dashboard-Template ersetzt werden. Übernimm Aufbau, Kartenhierarchie, Farbstimmung, Schriftmischung, Rundungen, Schatten, mobile Navigation und den Drei-Schritt-Flow so nah wie technisch sinnvoll. Nutze shadcn/ui als zugängliche Grundlage, aber überschreibe dessen Standardoptik konsequent mit dem Dialed-Designsystem.

Nicht erlaubt:

- den alten HTML-Prototyp per `iframe` einzubetten;
- das Design als statisches Bild nachzubauen;
- nur Mockdaten oder LocalStorage als dauerhafte Datenquelle zu verwenden;
- Supabase Auth nur vorzutäuschen;
- RLS wegzulassen;
- veraltete Supabase-Auth-Helper zu verwenden;
- wichtige Funktionen als `TODO`, Pseudocode oder Platzhalter stehenzulassen;
- das UI mit Blau, Violett, Neonfarben, harten schwarzen Schatten oder Standard-shadcn-Grau zu verfremden.

---

# 1. Ziel und Ergebnis

Erstelle eine vollständige, responsive und auf Vercel deploybare Anwendung mit diesem Stack:

- **Frontend:** Next.js mit App Router, React und TypeScript
- **Styling/UI:** Tailwind CSS und shadcn/ui
- **Hosting:** Vercel
- **Datenbank:** Supabase Postgres
- **Authentication:** Supabase Auth

Nutze die aktuell stabile, miteinander kompatible Version der Pakete. Falls im Repository bereits ein Package Manager verwendet wird, behalte ihn bei; sonst nutze `pnpm`.

Am Ende müssen vorhanden sein:

- eine lauffähige Next.js-App;
- Supabase-SSR-Integration mit Cookie-basierter Session;
- Login, Registrierung, Logout und geschützte App-Routen;
- vollständige SQL-Migrationen inklusive RLS, Triggern und Indizes;
- Bohnen-, Equipment-, Settings- und Shot-Daten in Supabase;
- der komplette mobile Drei-Schritt-Shot-Flow;
- Dashboard, Shot-Historie, Bohnen und Setup;
- responsive Desktop-Präsentation wie in `desktop-preview.png`;
- Formularvalidierung, Lade-, Fehler- und Leerzustände;
- Tests für zentrale Berechnungen und Kernabläufe;
- `.env.example` und eine klare `README.md` mit lokaler Einrichtung, Supabase-Setup und Vercel-Deployment;
- ein erfolgreicher Produktions-Build ohne TypeScript- oder Lint-Fehler.

Erstelle zuerst einen kurzen Arbeitsplan, setze ihn danach aber unmittelbar vollständig um. Halte nicht nach dem Plan an.

---

# 2. Technische Leitplanken

## 2.1 Next.js

- Nutze den **App Router** und ein `src/`-Verzeichnis.
- Nutze TypeScript im Strict Mode.
- Server Components sind Standard.
- Setze Client Components nur dort ein, wo Browser-State oder direkte Interaktion nötig sind, insbesondere Timer, Wizard, interaktive Charts, Dialoge und Form-Controls.
- Nutze Server Actions oder serverseitige Mutationsfunktionen für CRUD-Operationen.
- Authentifizierte Nutzerdaten dürfen nicht zwischen Nutzern gecacht werden.
- Nutze `next/font/google` für die festgelegten Fonts.
- Nutze `next/navigation` für Navigation und Redirects.
- Halte die URL-Struktur nachvollziehbar; der Browser-Zurück-Button muss sinnvoll funktionieren.

## 2.2 Supabase

Verwende:

- `@supabase/supabase-js`
- `@supabase/ssr`

Erstelle mindestens:

- `src/lib/supabase/client.ts` für Client Components;
- `src/lib/supabase/server.ts` für Server Components, Server Actions und Route Handler;
- `src/lib/supabase/proxy.ts` für Session-Aktualisierung;
- `src/proxy.ts` nach dem aktuellen Next.js-/Supabase-SSR-Muster;
- `src/app/auth/callback/route.ts` für den Auth-Code-Austausch.

Nutze serverseitig für Route Protection die aktuell empfohlene verifizierende Auth-Methode. Verlasse dich serverseitig nicht auf eine ungeprüfte Session. Nutze keine deprecated Pakete wie `@supabase/auth-helpers-nextjs`.

Umgebungsvariablen:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Ein Service-Role-Key darf niemals im Browser landen. Falls du einen optionalen lokalen Seed-Helper baust, darf er den Service-Role-Key ausschließlich in einem lokalen Node-Skript nutzen und muss in Produktion deaktiviert sein.

## 2.3 Formulare und Daten

Nutze:

- `react-hook-form`
- `zod`
- `@hookform/resolvers`

Alle Formulare benötigen:

- clientseitige nutzerfreundliche Validierung;
- serverseitige erneute Validierung;
- verständliche deutsche Fehlermeldungen;
- Disabled-/Pending-Zustände;
- Schutz vor Doppel-Submits;
- korrekte Labels und Fokusführung.

## 2.4 UI-Bibliotheken

Nutze aus shadcn/ui nur die Komponenten, die wirklich helfen, beispielsweise:

- Button
- Input
- Label
- Textarea
- Select oder Combobox
- Switch
- Dialog oder Sheet
- Card
- Badge
- Form
- Tooltip
- Popover und Calendar für Datumseingaben
- Skeleton
- Alert Dialog
- Sonner/Toast
- Chart-Utilities mit Recharts

Nutze `lucide-react` für Icons. Die Kaffee-Bohnen-Illustrationen und die dekorativen Ringe der Hero-Karte sollen als CSS/SVG umgesetzt werden, nicht als Stockfoto.

---

# 3. Projekt- und Routenstruktur

Nutze sinngemäß diese Struktur. Passe sie nur an, wenn das bestehende Repository eine klar bessere Struktur vorgibt:

```text
src/
  app/
    layout.tsx
    globals.css
    page.tsx
    manifest.ts
    (auth)/
      auth/
        login/page.tsx
        sign-up/page.tsx
        forgot-password/page.tsx
        update-password/page.tsx
    auth/
      callback/route.ts
    (protected)/
      app/
        layout.tsx
        page.tsx
        shots/
          page.tsx
          new/page.tsx
          [shotId]/page.tsx
        beans/
          page.tsx
          new/page.tsx
          [beanId]/page.tsx
        setup/page.tsx
  components/
    ui/
    app-shell/
    dashboard/
    shots/
    beans/
    setup/
    auth/
  features/
    auth/
    beans/
    equipment/
    shots/
    settings/
    analytics/
  lib/
    supabase/
    calculations/
    formatting/
    validation/
  types/
    database.ts
    domain.ts
supabase/
  migrations/
  config.toml
```

Erwartetes Routing:

- `/` prüft die Session und leitet zu `/app` oder `/auth/login`.
- `/auth/login`
- `/auth/sign-up`
- `/auth/forgot-password`
- `/auth/update-password`
- `/auth/callback`
- `/app` = Dashboard „Heute“
- `/app/shots` = Shot-Historie
- `/app/shots/new` = Vollbild-Wizard
- `/app/shots/[shotId]` = Shot-Detail
- `/app/beans` = Bohnenübersicht
- `/app/beans/new` = Bohne hinzufügen, visuell als Vollbild-Sheet auf Mobile
- `/app/beans/[beanId]` = Bean-Detail/Bearbeiten
- `/app/setup` = Equipment und Einstellungen

Der Shot-Wizard darf als normale Route innerhalb des App-Shells oder als sauber implementierte Modal-/Intercepting-Route umgesetzt werden. Entscheidend ist: direkt aufrufbar, Browser-Zurück funktioniert, mobil Vollbild, dieselbe Animation wie im Prototyp.

---

# 4. Exaktes visuelles Designsystem

## 4.1 Fonts

Nutze exakt diese Schriftrollen:

- **Display/Editorial:** `Newsreader`
- **UI/Text:** `Inter`
- **Timer und technische Zahlen:** `JetBrains Mono`

Lade sie über `next/font/google` und mappe sie auf CSS-Variablen:

```css
--font-display
--font-sans
--font-mono
```

Empfohlene Schnitte:

- Newsreader: 400, 500, 600 sowie italic 400/500
- Inter: 400, 500, 600, 700, 800
- JetBrains Mono: 500, 600

Nutze tabellarische Ziffern für Timer und Messwerte. Die Display-Schrift erhält leicht negatives Tracking. UI-Text bleibt ruhig, klar und kompakt.

## 4.2 Farben

Lege die folgenden Werte als zentrale CSS-Variablen in `globals.css` an und mappe sie zusätzlich sauber auf shadcn-Semantikvariablen:

```css
--dialed-canvas: #EEE6DC;
--dialed-surface: #FBF8F3;
--dialed-surface-subtle: #F3ECE4;
--dialed-surface-strong: #EBE1D6;
--dialed-text: #241914;
--dialed-text-secondary: #5E5048;
--dialed-text-muted: #8D7E74;
--dialed-line: rgba(48, 32, 25, 0.10);
--dialed-espresso: #2B1B16;
--dialed-espresso-raised: #3C251D;
--dialed-crema: #C8804F;
--dialed-crema-soft: #F0D7C5;
--dialed-sage: #6F806F;
--dialed-sage-soft: #DFE7DC;
--dialed-rose: #A95F52;
--dialed-rose-soft: #F2DCD7;
--dialed-gold: #D1A04D;
--dialed-white: #FFFFFF;
```

Geschmacksfarben:

```ts
verySour: '#D5A347'
sour: '#D6B262'
balanced: '#6F806F'
bitter: '#B5745B'
veryBitter: '#945447'
```

Keine Dark-Mode-Implementierung in dieser Version. Die App ist bewusst ein warmer Light Mode.

## 4.3 Radien, Linien und Schatten

```css
--radius-sm: 13px;
--radius-md: 18px;
--radius-lg: 24px;
--radius-xl: 30px;
--radius-pill: 999px;

--shadow-sm: 0 8px 20px rgba(54, 34, 24, 0.08);
--shadow-md: 0 16px 35px rgba(54, 34, 24, 0.11);
--shadow-lg: 0 30px 80px rgba(54, 34, 24, 0.20);
```

- Große Cards: 24–30 px Radius.
- Listen-Cards und Eingaben: 13–18 px.
- Buttons, Filter und Chips: Pill-Radius.
- Linien: 1 px, warmes Braun mit etwa 10 % Opazität.
- Keine harten schwarzen Drop-Shadows.

## 4.4 Motion

```css
--motion-fast: 180ms;
--motion-normal: 350ms;
--motion-sheet: 520ms;
--motion-ease: cubic-bezier(.2,.75,.2,1);
```

Erwartete Animationen:

- Screen-Wechsel: Opacity 0 → 1 und `translateY(8px)` → 0 in etwa 350–420 ms.
- Vollbild-Sheet: von unten mit 520 ms und `--motion-ease`.
- Kaffee-Bohne in der Hero-Card: sehr subtile vertikale Bewegung über etwa 5,5 s.
- Chart-Punkte erscheinen leicht gestaffelt.
- Button-Press: `scale(0.97)`.
- Erfolgs-Toast gleitet von unten ein.
- Timer-Ring füllt sich bis 40 Sekunden, danach bei 100 % stehenbleiben.
- `prefers-reduced-motion` muss sämtliche nicht notwendigen Animationen praktisch deaktivieren.

## 4.5 Responsive Grundlayout

### Desktop ab etwa 921 px

Baue die Präsentation wie in `desktop-preview.png`:

- Body-Hintergrund `--dialed-canvas` mit zwei sehr subtilen radialen Verläufen:
  - Crema links oben;
  - Sage rechts unten.
- Zentrierte Zweispalten-Bühne:
  - linke Markenfläche maximal etwa 410 px;
  - rechte App-Fläche etwa 390–430 px;
  - Abstand responsiv 28–84 px.
- Linke Markenfläche:
  - Eyebrow `ESPRESSO, MESSBAR GEMACHT` in Crema, 12 px, uppercase, Tracking etwa `0.16em`, mit kurzer horizontaler Linie;
  - Headline `Dial in.` und darunter `Drink better.`;
  - erste Zeile Newsreader normal, zweite Zeile Newsreader italic in Crema;
  - Desktopgröße bis etwa 76 px, Line-height 0.94, Tracking etwa `-0.055em`;
  - Beschreibung exakt im Stil des Prototyps;
  - vier Feature-Pills: `3‑Schritt‑Workflow`, `Live‑Timer`, `Sweet‑Spot‑Analyse`, `Cloud Sync`.
- Rechte App-Fläche:
  - simuliertes Smartphone nur auf Desktop/Tablet;
  - Breite maximal 430 px;
  - Höhe `min(900px, calc(100vh - 48px))`, mindestens 700 px;
  - 9 px dunkler Rahmen;
  - 44 px äußerer Radius;
  - dezente Notch oben;
  - großer warmer Schatten.

### Tablet 561–920 px

- Markenfläche ausblenden.
- App mittig als Phone-Frame anzeigen.

### Mobile bis 560 px

- Phone-Rahmen und Notch vollständig entfernen.
- App nutzt `100dvh` und die gesamte Breite.
- Kein horizontaler Scroll.
- Safe-Area-Inset oben und unten berücksichtigen.
- Bottom Navigation bleibt am unteren Rand.
- Primäre Aktionen liegen einhändig erreichbar im unteren Bereich.

---

# 5. App-Shell und Navigation

## 5.1 Inhalt

Die App selbst hat `--dialed-surface` als Hintergrund. Der scrollbare Content erhält auf dem Phone ungefähr:

- oben 34 px auf Desktop-Phone beziehungsweise Safe Area + 18 px auf echtem Mobile;
- horizontal 18 px;
- unten ausreichend Abstand zur Bottom Navigation.

## 5.2 Bottom Navigation

Vier gleich breite Tabs:

1. `Heute` – Home-Icon
2. `Shots` – Listen-/Sliders-Icon
3. `Bohnen` – Bean/Leaf-Icon
4. `Setup` – Settings-Icon

Stil:

- halbtransparenter Surface-Hintergrund mit leichtem Blur;
- 1 px Top-Border;
- Icon etwa 20 px, Strichstärke 1.8;
- Label etwa 9 px;
- inaktiv `--dialed-text-muted`;
- aktiv `--dialed-espresso`, font-weight 800;
- aktiver Tab hat oben einen 28 × 3 px Crema-Indikator.

Die Navigation muss anhand des aktuellen Pfads korrekt aktiv sein.

---

# 6. Authentifizierung und Auth-Screens

Implementiere:

- Registrierung mit Name, E-Mail und Passwort;
- Login mit E-Mail und Passwort;
- E-Mail-Bestätigungs-/Callback-Flow;
- Passwort vergessen;
- Passwort aktualisieren;
- Logout;
- Weiterleitung nicht authentifizierter Nutzer zu `/auth/login`;
- Weiterleitung authentifizierter Nutzer von Auth-Seiten zu `/app`.

Auth-Screens existieren nicht in den Referenzbildern. Erweitere das Design daher konsistent, ohne eine neue Designsprache einzuführen:

- Desktop nutzt dieselbe linke Brand-Fläche wie die App-Präsentation.
- Rechts steht statt des Phone-Inhalts eine 390–430 px breite Auth-Card mit Surface-Hintergrund, 30 px Radius und warmem Schatten.
- Mobile ist die Auth-Seite vollflächig ohne künstlichen Phone-Rahmen.
- Headline in Newsreader, Formulartext in Inter.
- Primärbutton Crema oder Espresso entsprechend Kontext.
- Keine Social-Login-Buttons, sofern sie nicht bereits konfiguriert sind.
- Auth-Fehler verständlich auf Deutsch anzeigen.

Das runde Avatar-Element im Dashboard zeigt den ersten Buchstaben des Profilnamens beziehungsweise der E-Mail. Im Setup gibt es am Ende einen dezenten Account-Bereich mit E-Mail und Logout; er darf nicht die oben gezeigte Hauptkomposition stören.

---

# 7. Datenbankmodell in Supabase

Erstelle versionierte Migrationen in `supabase/migrations/`. Nutze `uuid`-IDs mit `gen_random_uuid()`, `timestamptz`, sinnvolle Checks und Indizes.

## 7.1 Enums

Erstelle sinngemäß folgende Postgres-Enums:

```sql
bean_process: washed, natural, honey, anaerobic, unknown
roast_level: light, medium_light, medium, dark
equipment_type: machine, grinder, basket, tool
shot_taste: very_sour, sour, balanced, bitter, very_bitter
shot_flow: even, minor_channeling, channeling, spritzing
puck_state: dry, ideal, wet, stuck
```

## 7.2 `profiles`

Felder:

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text`
- `avatar_url text null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## 7.3 `beans`

Felder:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `roaster text not null`
- `roast_date date not null`
- `origin text null`
- `process bean_process not null default 'unknown'`
- `roast_level roast_level null`
- `tasting_notes text[] not null default '{}'`
- `purchase_date date null`
- `price_cents integer null check (price_cents >= 0)`
- `package_grams numeric(8,2) null check (package_grams > 0)`
- `is_decaf boolean not null default false`
- `archived_at timestamptz null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## 7.4 `equipment`

Felder:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `type equipment_type not null`
- `name text not null`
- `notes text null`
- `archived_at timestamptz null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Verhindere sinnvolle Duplikate pro Nutzer, Typ und normalisiertem Namen, ohne legitime gleichnamige Geräte unnötig zu blockieren.

## 7.5 `user_settings`

Felder:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `default_machine_id uuid null references equipment(id) on delete set null`
- `default_grinder_id uuid null references equipment(id) on delete set null`
- `last_bean_id uuid null references beans(id) on delete set null`
- `auto_fill boolean not null default true`
- `default_prep_tools text[] not null default array['WDT','Tamper','Puck Screen']`
- `dial_in_suggestions_enabled boolean not null default true`
- `roast_age_warning_enabled boolean not null default true`
- `roast_age_warning_days integer not null default 45 check (roast_age_warning_days between 1 and 365)`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## 7.6 `shots`

Felder:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `bean_id uuid not null references beans(id)`
- `machine_id uuid null references equipment(id) on delete set null`
- `grinder_id uuid null references equipment(id) on delete set null`
- `basket_id uuid null references equipment(id) on delete set null`
- `shot_at timestamptz not null default now()`
- `grind_setting text not null`
- `dose_grams numeric(7,2) not null check (dose_grams > 0)`
- `temperature_c numeric(5,2) null check (temperature_c between 50 and 110)`
- `preinfusion_seconds numeric(6,2) null check (preinfusion_seconds >= 0)`
- `prep_tools text[] not null default '{}'`
- `extraction_seconds numeric(7,2) not null check (extraction_seconds > 0)`
- `stop_weight_grams numeric(7,2) not null check (stop_weight_grams >= 0)`
- `final_yield_grams numeric(7,2) not null check (final_yield_grams > 0)`
- `taste shot_taste not null`
- `flow shot_flow not null`
- `puck puck_state not null`
- `notes text null`
- `score smallint not null check (score between 0 and 100)`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Die Anwendung validiert zusätzlich, dass das finale Gewicht normalerweise nicht kleiner als das Stop-Gewicht ist. Zeige bei ungewöhnlichen Werten eine klare Fehlermeldung.

## 7.7 Ownership-Constraints, Trigger und Indizes

Sichere die Mandantentrennung nicht nur in React-Code. Ergänze in `beans` und `equipment` jeweils einen eindeutigen Schlüssel auf `(id, user_id)` und verwende für nutzergebundene Beziehungen nach Möglichkeit zusammengesetzte Foreign Keys:

- `shots(bean_id, user_id)` → `beans(id, user_id)`;
- `shots(machine_id, user_id)` → `equipment(id, user_id)`;
- `shots(grinder_id, user_id)` → `equipment(id, user_id)`;
- `shots(basket_id, user_id)` → `equipment(id, user_id)`;
- entsprechende Ownership-Prüfung für `user_settings.last_bean_id`, `default_machine_id` und `default_grinder_id`.

Nullable Beziehungen müssen weiterhin funktionieren. Falls zusammengesetzte Foreign Keys bei einer konkreten nullable Struktur unnötig komplex werden, nutze einen robusten Datenbank-Trigger, der die gleiche Eigentümerprüfung erzwingt. Eine reine Client-Prüfung reicht nicht.

Erstelle außerdem:

- einen generischen `updated_at`-Trigger;
- einen `security definer` Auth-Trigger mit sicher gesetztem `search_path`, der bei einem neuen Nutzer ein `profiles`- und `user_settings`-Objekt anlegt;
- Indizes auf:
  - `shots(user_id, shot_at desc)`
  - `shots(user_id, bean_id, shot_at desc)`
  - `beans(user_id, archived_at, created_at desc)`
  - `equipment(user_id, type, archived_at)`

## 7.8 Row Level Security

Aktiviere RLS auf allen öffentlichen Nutzertabellen.

Regeln:

- Ein authentifizierter Nutzer darf ausschließlich das eigene Profil lesen/ändern.
- Ein authentifizierter Nutzer darf ausschließlich eigene Bohnen, Geräte, Settings und Shots lesen, einfügen, ändern und löschen.
- `user_id` muss bei Inserts und Updates `auth.uid()` entsprechen.
- Fremde IDs dürfen nicht indirekt über Beziehungen verwendet werden. Prüfe serverseitig, dass ausgewählte Bohne und Geräte demselben Nutzer gehören.
- Keine pauschalen Public-Policies.

Erzeuge danach TypeScript-Datenbanktypen und verwende sie im Code. Dokumentiere den Regenerierungsbefehl in der README.

---

# 8. Domain-Modelle und Berechnungen

Lege reine, gut testbare Funktionen in `src/lib/calculations/` an.

## 8.1 Abgeleitete Werte

```ts
brewRatio = finalYieldGrams / doseGrams
postStopDrip = finalYieldGrams - stopWeightGrams
roastAgeDays = differenceInCalendarDays(shotAtOrToday, roastDate)
```

- Brew Ratio wird deutsch als `1 : 1,89` formatiert.
- Gewicht als beispielsweise `19,0 g`.
- Zeit als beispielsweise `28,5 s`.
- Daten im deutschen Locale `de-DE`.
- Datenbankwerte bleiben sprachneutral.

## 8.2 Shot-Score

Übernimm für Version 1 transparent die Logik des Prototyps:

```ts
let score = 100
score -= Math.min(20, Math.abs(extractionSeconds - 28) * 2.2)
score -= Math.min(18, Math.abs(brewRatio - 1.95) * 28)

score -= {
  very_sour: 18,
  sour: 8,
  balanced: 0,
  bitter: 8,
  very_bitter: 18,
}[taste]

score -= {
  even: 0,
  minor_channeling: 5,
  channeling: 14,
  spritzing: 18,
}[flow]

score -= {
  ideal: 0,
  dry: 5,
  wet: 5,
  stuck: 8,
}[puck]

score = Math.round(clamp(score, 45, 98))
```

Berechne den Score live im Review-Schritt und serverseitig beim Speichern erneut. Vertraue nicht auf einen vom Client gesendeten Score. Kennzeichne den Score im UI als motivierende Heuristik, nicht als wissenschaftliche Messung.

## 8.3 Sweet Spot

Default-Zielkorridor:

- Extraktionszeit: 25–32 Sekunden
- Brew Ratio: 1,80–2,15

Ein Shot liegt im Zielbereich, wenn beide Bedingungen erfüllt sind. Für das Scatterplot ist:

- x = Extraktionszeit in Sekunden;
- y = finales Getränkgewicht in Gramm;
- Farbe = Geschmack;
- Referenzfläche = Zielkorridor, wobei die Y-Grenzen aus der typischen/aktuellen Dosis berechnet werden.

Dashboard-Zeitraum standardmäßig: letzte 30 Tage.

## 8.4 Dial-in-Empfehlungen

Implementiere eine deterministische, nachvollziehbare Regel-Engine. Priorität:

1. **Starkes Channeling oder Spritzing:** zuerst Puck Prep verbessern; keine reine Mahlgrad-Empfehlung.
2. **Leichtes Channeling:** WDT/Verteilung/Tampen prüfen.
3. **Sauer + zu schnell:** etwas feiner mahlen.
4. **Sauer + normal/langsam:** Temperatur leicht erhöhen oder längere Bohnenruhe prüfen.
5. **Bitter + zu langsam:** etwas gröber mahlen.
6. **Bitter + hohes Ratio:** etwas früher stoppen beziehungsweise Yield reduzieren.
7. **Hoher Nachlauf:** künftiges Stop-Gewicht um den historischen Median-Nachlauf früher setzen.
8. **Balanciert und stabil:** Rezept festhalten und nur kleine Änderungen empfehlen.

Die Dashboard-Insight verwendet Titel und Erklärung, zum Beispiel:

- `Ein Tick feiner mahlen`
- `Puck Prep zuerst stabilisieren`
- `Etwas früher stoppen`
- `Rezept sitzt – festhalten`

Nutze beim Text möglichst einen Vergleich zum besten bisherigen Shot derselben Bohne, etwa Zeitdifferenz, Ratio oder Nachlauf. Keine KI-/LLM-Abhängigkeit in Version 1.

---

# 9. Dashboard „Heute“

Setze den Screen sehr nah an `ui-flow-overview.png` und `index.html` um.

## 9.1 Header

- Oben links dynamisches Datum in Deutsch, uppercase-artiger Microcopy-Stil, 11 px, Tracking `0.14em`, muted.
- Darunter Tagesgruß in Newsreader, etwa 30 px:
  - morgens `Guten Morgen`;
  - tagsüber `Guten Tag`;
  - abends `Guten Abend`.
- Rechts runder Avatar 42 × 42 px, Espresso-Hintergrund, heller Initial-Buchstabe, subtiler innerer Ring.

## 9.2 Hero „Nächster Shot“

- Dunkle Karte mit Gradient von Espresso zu Espresso Raised.
- Radius 30 px, Innenabstand 24 px, Mindesthöhe etwa 218 px.
- Weiße Textfarbe.
- Zwei sehr dezente elliptische Outline-Ringe als Dekoration.
- Rechts oben eine stilisierte dreidimensionale Kaffee-Bohne aus CSS, etwa 68 × 92 px, warmbrauner Verlauf und subtile Float-Animation.
- Label `NÄCHSTER SHOT` als Microcopy.
- Bean-Name in Newsreader, etwa 29 px.
- Metazeile beispielsweise `19,0 g · Mahlgrad 2,4 · zuletzt 91 Punkte`.
- Unten links weißer Pill-Button `Shot starten` mit Plus-Icon.
- Verwendet letzte Bohne und Werte des letzten Shots; wenn keine Shots existieren, verwende die zuletzt gewählte beziehungsweise neueste aktive Bohne und sinnvolle leere Copy.

## 9.3 Sweet-Spot-Sektion

Heading-Zeile:

- links `Dein Sweet Spot`;
- rechts `Letzte 30 Tage`.

Chart-Card:

- weiß;
- Radius 24 px;
- 1 px Border;
- Shadow Small;
- oben links Prozentwert in Newsreader, etwa 25 px;
- darunter `Shots im Zielbereich`;
- oben rechts Delta-Badge in Sage Soft, falls Vergleichsdaten existieren;
- Chart-Höhe etwa 176 px;
- dünne gepunktete Grid-Lines;
- X-Achse standardmäßig 20–40 s;
- Y-Achse sinnvoll um etwa 30–45 g, aber datenabhängig erweitern;
- gestrichelte Sage-Referenzfläche `Sweet Spot`;
- subtile gestrichelte Verbindungslinie zwischen chronologisch sortierten Punkten;
- Punkte etwa 5 px Radius, auf Hover/Tap größer;
- Tooltip mit Datum, Bohne, Zeit, Yield, Ratio und Geschmack;
- kleine Legende `Shot / Farbe = Geschmack` und `Zielbereich`.

Unter dem Chart drei gleich breite Metric-Cards:

1. `Ø Brew Ratio`
2. `Ø Zeit`
3. `Serie`

Stil:

- Surface Subtle;
- Radius 18 px;
- ungefähr 13 × 12 px Padding;
- Micro-Label 9 px;
- Wert 15 px semibold;
- unten ein sehr dünner Fortschrittsstrich mit Crema-Akzent.

Definiere `Serie` nachvollziehbar als aktuelle Logging-Serie: aufeinanderfolgende Shots, zwischen denen nie mehr als sieben Tage liegen. Zeige `1 Shot` beziehungsweise `n Shots`.

## 9.4 Insight „Nächster Versuch“

- Heading `Nächster Versuch`.
- Card mit sehr subtilem Sage-/Creme-Verlauf.
- Radius 24 px.
- Links weißes 39 × 39 px Icon-Feld, Sage-Icon.
- Rechts Empfehlungstitel und kurze Erklärung.
- Nutze die Regel-Engine aus Abschnitt 8.4.

## 9.5 Letzte Extraktionen

- Heading `Letzte Extraktionen`.
- Rechts `Alle ansehen` führt zu `/app/shots`.
- Zeige die letzten vier Shots.

Shot-Card:

- weiß, 1 px Border, Radius 18 px, warmer leichter Schatten;
- Grid: Score-Ring 46 px, Textblock, Werte rechts;
- Score-Ring als Crema-Conic-Gradient mit weißem Inneren;
- Bean-Name;
- Datum/Uhrzeit und Mahlgrad;
- rechts `19,0 → 36,2 g`;
- darunter Geschmackspunkt, Zeit und Ratio;
- Card-Tap öffnet Shot-Detail.

Leerer Zustand:

- Newsreader-Headline `Noch kein Shot`;
- kurze Erklärung;
- klarer Button `Ersten Shot starten`.

---

# 10. Shot-Historie

Screen-Header:

- Newsreader-Headline `Extraktionen`;
- darunter `n Shots dokumentiert`;
- rechts runder 40 px Add-Button.

Filter-Pills horizontal scrollbar-frei:

- `Alle`
- `Sweet Spot`
- `Sauer`
- `Bitter`

Aktiver Filter: Espresso-Hintergrund, weißer Text. Inaktive Filter: weiß, Border, Text Secondary.

Filterlogik:

- Sweet Spot = Zeit und Ratio im Zielkorridor;
- Sauer = `very_sour` oder `sour`;
- Bitter = `bitter` oder `very_bitter`.

Sortiere absteigend nach `shot_at`. Nutze Pagination oder Infinite Loading, sobald mehr als 30 Einträge vorhanden sind. Die erste Ansicht darf 30 Einträge laden. Ladezustand als Skeleton im echten Card-Layout.

Shot-Detail:

- auf Mobile als Sheet, auf Desktop als Dialog oder Detailroute im Phone-Kontext;
- zeigt alle Rohwerte, Brew Ratio, Nachlauf, Geschmack, Flow, Puck, Tools, Notiz und Score;
- erlaubt Bearbeiten und Löschen mit Alert Dialog;
- Löschung aktualisiert Dashboard und Listen ohne kompletten Browser-Reload.

---

# 11. Bohnen

## 11.1 Übersicht

Header:

- `Bohnen` in Newsreader;
- `n aktive Sorten`;
- runder Add-Button.

Featured Card für zuletzt verwendete Bohne:

- Verlauf `#EAD5C5` → `#F6EDE4` → `#E5E8DF`;
- Radius 30 px;
- Mindesthöhe etwa 180 px;
- Badge `Zuletzt verwendet`;
- Bean-Name Newsreader etwa 27 px;
- Rösterei und Herkunft;
- unten links `Geröstet vor n Tagen`;
- rechts CSS-Kaffeebohne etwa 84 × 112 px.

Sammlung:

- Heading `Deine Sammlung`;
- rechts `Hinzufügen`;
- Bean-Cards mit 46 px Icon-Feld, Name, Rösterei/Herkunft, rechts Röstalter und Shot-Anzahl.
- Archivierte Bohnen standardmäßig ausblenden; optional über einen dezenten Filter erreichbar.
- Bean-Card öffnet Detail/Bearbeitung.

## 11.2 Bohne hinzufügen/bearbeiten

Mobile Vollbild-Sheet mit Header `Neue Bohne` beziehungsweise `Bohne bearbeiten`.

Intro:

- `Was landet in der Mühle?`
- `Die wichtigsten Angaben bleiben schnell erfassbar; Details sind optional.`

Pflichtfelder:

- Name der Bohne
- Rösterei / Hersteller
- Röstdatum

Optionale Felder:

- Röstgrad
- Herkunft
- Aufbereitung
- Tasting Notes als editierbare Tags oder kommagetrennte Eingabe
- Kaufdatum
- Preis
- Packungsgröße
- Entkoffeiniert

Footer:

- links `Abbrechen`;
- rechts `Bohne speichern`.

Nach dem Erstellen:

- Bohne wird gespeichert;
- `user_settings.last_bean_id` wird auf diese Bohne gesetzt;
- Bohne ist beim nächsten Shot vorausgewählt;
- Toast `Bohne hinzugefügt`.

Bean-Detail zeigt zusätzlich:

- Röstalter;
- Anzahl Shots;
- besten Shot beziehungsweise bestes Rezept;
- Bearbeiten;
- Archivieren/Wiederherstellen;
- Löschen nur nach Bestätigung und nur, wenn dadurch keine referenzierten Shots unklar werden. Bevorzuge Archivieren vor hartem Löschen.

---

# 12. Setup

Header:

- `Dein Setup`;
- Unterzeile `Wird bei neuen Shots vorausgefüllt`;
- rechts kompakter dunkler Button `Speichern`.

## 12.1 Standard-Equipment-Card

Weiße Card mit 24 px Radius und drei Zeilen:

1. Siebträgermaschine
2. Mühle
3. Automatisch vorausfüllen

Jede Zeile:

- 42 px Icon-Spalte;
- Titel und Microcopy;
- rechts Eingabe/Combobox beziehungsweise Switch.

Maschine und Mühle sind echte `equipment`-Datensätze. Die Oberfläche darf visuell wie ein kompaktes Textfeld wirken, muss aber vorhandene Geräte auswählen und neue Namen anlegen können. Neue Einträge werden beim Speichern sauber upserted und als Default gesetzt.

## 12.2 Standard-Puck-Prep

Card mit Chips:

- WDT
- Tamper
- Puck Screen
- Leveler
- Papierfilter

Aktiv:

- Sage Soft Hintergrund;
- Sage Border/Text;
- Checkmark.

Inaktiv:

- Surface-Hintergrund;
- Pluszeichen.

Zusätzlich dürfen vom Nutzer angelegte Tools angezeigt werden. Ein sehr dezenter `Tool hinzufügen`-Flow ist erlaubt, solange die Hauptkomposition unverändert bleibt.

## 12.3 Smarte Hinweise

Zwei Zeilen:

- `Dial‑in‑Vorschläge` – `Aus Zeit, Ratio und Geschmack`
- `Röstalter warnen` – `Hinweis ab 45 Tagen`

Sage-Switches wie im Prototyp.

## 12.4 Account

Unterhalb der Designreferenz, klar sekundär:

- Anzeigename;
- E-Mail;
- Logout;
- optional Account löschen mit deutlicher Bestätigung.

---

# 13. Neuer Shot – Drei-Schritt-Wizard

Der Wizard ist die wichtigste Funktion. Er muss auf Mobile den gesamten Screen übernehmen und im Desktop-Phone innerhalb des Phone-Frames bleiben.

## 13.1 Gemeinsamer Aufbau

Header:

- Close-Button links, 38 px Kreis, Surface Subtle;
- zentriert `Neuer Shot` in Newsreader, etwa 22 px;
- darunter drei 4 px hohe Progress-Segmente;
- darunter Labels `Setup`, `Extraktion`, `Review`;
- aktueller/abgeschlossener Segmentanteil Crema.

Body:

- scrollbar ohne sichtbare Scrollbar;
- 18 px horizontal;
- Screen-Transition wie im Prototyp.

Sticky Footer:

- halbtransparenter Surface-Hintergrund mit Blur;
- Top-Border;
- Safe Area unten;
- zwei gleich breite Pill-Buttons;
- Schritt 1: Zurück unsichtbar, `Weiter` rechts;
- Schritt 2: `Zurück`, `Weiter`;
- Schritt 3: `Zurück`, `Shot speichern`.

Beim Schließen mit ungespeicherten Änderungen nach Schritt 1 oder laufendem Timer eine dezente Bestätigung anzeigen. Beim direkten Öffnen wird ein neuer Draft erzeugt.

## 13.2 Schritt 1 – Setup

Intro:

- `Was kommt in den Siebträger?`
- `Dein letztes Setup ist bereits ausgewählt. Passe nur an, was heute anders ist.`

### Bohne

- Form-Section weiß, 24 px Radius;
- Titel `Bohne`, rechts `Zuletzt genutzt`;
- Selection-Card mit Bean-Icon, Name, Rösterei und Röstalter;
- Chevron rechts;
- Klick öffnet zugängliche Auswahl/Combobox;
- letzte Bohne vorausgewählt.

### Equipment

- Section-Titel `Equipment`, rechts `Standard`;
- Selection-Card für Maschine;
- Selection-Card für Mühle;
- Defaults aus `user_settings`;
- bei deaktiviertem Auto-Fill keine stille Übernahme, sondern klare Auswahl.

### Mahlgrad, Dosis, Temperatur

- Mahlgrad als Full-Width-Stepper:
  - Minus-Button 42 px;
  - mittiges Input-Feld;
  - Plus-Button 42 px;
  - Schrittweite bei numerischem Wert 0,1;
  - trotzdem als Text speichern, um Grinder-Skalen flexibel zu halten.
- Dosis in Gramm, Standard aus letztem Shot derselben Bohne, sonst 19,0.
- Temperatur optional, Standard 93 °C.
- Eingaben in Surface Subtle mit 13 px Radius und mindestens 47 px Höhe.

### Puck Prep

2 × 2 Toggle-Grid wie im Referenzbild:

- WDT
- Tamper
- Puck Screen
- Leveler

Weitere Tools können unterhalb folgen. Aktive Cards Sage Soft. Nutze kleine lineare Icons.

Validierung vor `Weiter`:

- Bohne vorhanden;
- Maschine/Mühle bei aktivem Equipment-Tracking vorhanden;
- Mahlgrad nicht leer;
- Dosis > 0;
- Temperatur leer oder plausibel.

## 13.3 Schritt 2 – Extraktion

Intro:

- `Extraktion läuft.`
- `Nutze den Timer live oder trage die Werte später manuell ein.`

### Timer

- 204 × 204 px Kreis;
- äußerer Conic-Gradient mit Crema-Fortschritt und Surface Strong Rest;
- 10 px Innenabstand, innerer Kreis Surface;
- warmer Shadow;
- Microcopy `EXTRAKTIONSZEIT`;
- Wert in JetBrains Mono, etwa 45 px, Format `00:00.0`;
- Fortschritt linear bis 40 Sekunden;
- `requestAnimationFrame` plus `performance.now()` für präzises Start/Stop/Resume;
- bei Hintergrund-Tab muss die Zeit anhand des absoluten Startzeitpunkts korrekt weitergerechnet werden.

Buttons:

- `Timer starten` / `Timer stoppen` / `Weiterlaufen`;
- Start dunkel Espresso;
- laufender Stop-Zustand Rose;
- `Zurücksetzen` Surface Subtle.

### Live Ratio

Dunkle 18 px Card:

- links `Aktuelles Brew Ratio`;
- rechts Newsreader-Wert, etwa 25 px;
- aktualisiert sich bei Änderungen von Dosis oder finalem Gewicht sofort.

### Werte

- `Zeit manuell korrigieren` Full Width in Sekunden;
- `Pumpe gestoppt bei` in Gramm;
- `Finales Gewicht` in Gramm;
- darunter Erklärung zum Nachlauf:
  - `Der Unterschied zeigt den Nachlauf deiner Maschine. So findest du später den richtigen Zeitpunkt zum Stoppen.`

Wenn der Timer läuft und der Nutzer `Weiter` drückt, stoppe ihn, übernehme den aktuellen Wert und gehe danach weiter.

Validierung:

- Zeit > 0;
- Dosis > 0;
- Stop-Gewicht >= 0;
- finales Gewicht > 0;
- finales Gewicht >= Stop-Gewicht;
- Ratio außerhalb eines plausiblen Bereichs darf eine Warnung zeigen, aber nur eindeutig falsche Werte blockieren.

## 13.4 Schritt 3 – Review

Intro:

- `Wie war der Shot?`
- `Geschmack und Puck‑Bild machen aus Messwerten eine echte Dial‑in‑Entscheidung.`

### Score Preview

Dunkle Gradient-Card, 24 px Radius:

- links 58 px runder Score;
- rechts `Voraussichtlicher Shot‑Score`;
- Erklärung `Aus Ratio, Zeit, Geschmack, Flow und Puck‑Zustand.`;
- Score aktualisiert sich bei jeder Auswahl.

### Geschmack

Fünf gleich breite Auswahlfelder in einer Reihe:

1. Sehr sauer
2. Leicht sauer
3. Balanciert
4. Leicht bitter
5. Sehr bitter

Nutze dieselben einfachen Symbole wie im Prototyp oder sehr nahe SVG-Äquivalente. Aktiver Zustand Crema Soft, Crema Border, leicht nach oben versetzt. Default `Balanciert`.

### Flow

2 × 2 Grid:

- Gleichmäßig – `Ruhiger, mittiger Flow`
- Leichtes Channeling – `Unruhig oder leicht seitlich`
- Starkes Channeling – `Mehrere schnelle Kanäle`
- Spritzing – `Deutliche seitliche Spritzer`

Aktiver Zustand Sage Soft. Default `Gleichmäßig`.

### Puck

2 × 2 Grid:

- Zu trocken – `Rissig oder sehr hart`
- Sauber & stabil – `Normal feucht, kompakt`
- Sehr nass – `Wasser steht auf dem Puck`
- Hängengeblieben – `Am Duschsieb festgeklebt`

Default `Sauber & stabil`.

### Notiz

Optionales Textarea mit Beispiel:

`z. B. süße Pflaume, dichter Körper, beim nächsten Mal 0,2 g weniger …`

### Speichern

Beim Speichern:

1. Alle Werte serverseitig erneut validieren.
2. Score serverseitig neu berechnen.
3. Shot für den aktuellen Nutzer einfügen.
4. `user_settings.last_bean_id` aktualisieren.
5. Dashboard-, Historien- und Bean-Daten revalidieren.
6. Wizard schließen beziehungsweise zu `/app` navigieren.
7. Toast anzeigen: `Shot gespeichert` und darunter `Bohnenname · 91 Punkte`.

Der neue Shot muss ohne manuellen Browser-Reload sofort sichtbar sein.

---

# 14. Loading, Error und Empty States

Jede Route braucht echte Zustände:

- Dashboard-Skeleton mit Hero-, Chart- und Card-Geometrie;
- Shot-List-Skeletons;
- Bean-List-Skeletons;
- leere Bohnenliste mit klarer Add-Aktion;
- leere Shot-Historie mit Start-Aktion;
- fehlende Defaults mit Hinweis im Wizard;
- Supabase-/Netzwerkfehler als ruhige Inline-Message und Toast;
- `error.tsx` und sinnvolle `not-found.tsx` für geschützte Details;
- Retry-Möglichkeit, wo sinnvoll.

Keine technischen Rohfehlermeldungen an Nutzer ausgeben. Logge serverseitig ausreichenden Kontext ohne sensible Daten.

---

# 15. Barrierefreiheit und Bedienung

- Mindestgröße interaktiver Touch-Ziele: 44 × 44 px, ausgenommen rein dekorative Elemente.
- Alle Inputs haben sichtbare Labels.
- Icon-only Buttons haben `aria-label`.
- Dialoge/Sheets fangen Fokus korrekt ein und geben ihn zurück.
- Wizard-Schrittstatus für Screenreader verständlich machen.
- Auswahlkarten nutzen korrekte Button-/Radio-Semantik und `aria-pressed` beziehungsweise RadioGroup.
- Timer-Status wird nicht bei jedem Zehntel laut vorgelesen; verwende eine separate sinnvolle Live-Region für Start/Stop.
- Fokuszustände sichtbar, warmes Crema-Ring-Design.
- Kontrast darf trotz Pastellfarben nicht zu schwach sein.
- Tastaturnavigation auf Desktop vollständig möglich.
- `prefers-reduced-motion` beachten.
- Kein horizontales Scrollen bei 320, 360, 375, 390 und 430 px Breite.

---

# 16. Performance und Sicherheit

- Keine unnötig großen Client Bundles.
- Recharts nur in der Chart-Komponente laden; bei Bedarf dynamisch, ohne sichtbaren Layout Shift.
- Keine externen Stockbilder.
- Server Components für initiale Daten.
- Nutzerspezifische Daten niemals statisch oder global cachen.
- Keine Secrets in `NEXT_PUBLIC_*` außer URL und Publishable Key.
- RLS bleibt die letzte Sicherheitsbarriere; trotzdem Ownership serverseitig validieren.
- Form-Inputs escapen beziehungsweise als normale React-Werte rendern; kein `dangerouslySetInnerHTML`.
- Mutationen gegen CSRF-/Session-Probleme nach aktuellem Next.js-/Supabase-Muster absichern.
- Keine SQL-Strings aus Nutzereingaben zusammenbauen.
- Löschen nur nach Bestätigung.

---

# 17. Tests

Nutze den im Projekt vorhandenen Test-Stack. Falls keiner existiert, richte einen schlanken Stack mit Vitest, React Testing Library und Playwright ein.

Mindestens testen:

## Unit Tests

- Brew Ratio;
- Nachlauf;
- Röstalter;
- Shot-Score inklusive Grenzwerten;
- Sweet-Spot-Klassifizierung;
- Dial-in-Regelpriorität;
- deutsche Formatierung.

## Component Tests

- Mahlgrad-Stepper;
- Puck-Prep-Toggles;
- Geschmacksauswahl;
- Timer Start/Stop/Resume/Reset mit Fake Timers, soweit praktikabel;
- Validierung der drei Wizard-Schritte.

## E2E-Kernpfad

Mit einer isolierten Testumgebung oder sauber gemockter Supabase-Schicht:

1. Nutzer meldet sich an.
2. Nutzer fügt eine Bohne hinzu.
3. Nutzer setzt Maschine und Mühle.
4. Nutzer dokumentiert einen Shot über alle drei Schritte.
5. Shot erscheint auf Dashboard und Historie.
6. Letzte Bohne ist beim nächsten Shot vorausgewählt.
7. Nutzer meldet sich ab und geschützte Route ist nicht mehr erreichbar.

Keine fragilen Pixel-Snapshot-Tests als einzige Designprüfung. Erzeuge zusätzlich bei 390 × 844 und 1440 × 900 Screenshots für manuellen Vergleich mit den Referenzbildern.

---

# 18. Seed- und Demo-Daten

Die Produktions-App startet für neue Nutzer leer und zeigt gute Empty States. Lege für lokale Entwicklung und Tests aber Fixtures an, die den Referenzzustand reproduzieren:

Bohnen:

- La Esperanza — Hoppenworth & Ploch — Colombia
- Kayon Mountain — Coffee Circle — Äthiopien
- House Espresso — Phoenix Coffee Roasters — Brasilien

Equipment:

- Sage Bambino Plus
- Eureka Mignon

Default Tools:

- WDT
- Tamper
- Puck Screen

Shots sinngemäß wie im alten Prototyp. Fixtures dürfen nicht automatisch für echte Produktionsnutzer angelegt werden. Dokumentiere einen sicheren lokalen Seed-Weg. Keine Service-Role-Credentials im Client oder Repository.

---

# 19. README und Deployment

Die `README.md` muss enthalten:

1. Produktübersicht.
2. Techstack.
3. Voraussetzungen.
4. Installation.
5. `.env.local`.
6. Supabase lokal starten oder Remote-Projekt verbinden.
7. Migrationen anwenden.
8. Database Types generieren.
9. Dev-Server starten.
10. Tests, Lint, Typecheck und Build.
11. Vercel-Deployment.
12. Benötigte Vercel Environment Variables.
13. Supabase Redirect URLs für Localhost, Preview Deployments und Produktion.
14. RLS-/Security-Hinweis.
15. Beschreibung der Score- und Recommendation-Logik.

Erstelle `.env.example`, aber niemals echte Keys.

---

# 20. Konkrete Akzeptanzkriterien

Die Umsetzung gilt erst als fertig, wenn alle Punkte erfüllt sind:

## Design

- Das mobile Dashboard ist auf den ersten Blick klar dieselbe Gestaltung wie `ui-flow-overview.png`.
- Desktop zeigt dieselbe Zweispalten-Komposition wie `desktop-preview.png`.
- Farben entsprechen exakt den Tokens.
- Newsreader, Inter und JetBrains Mono sind korrekt geladen und eingesetzt.
- Kartenradien, Schatten, Navigation und Hero-Card wirken nicht wie shadcn-Defaults.
- Auf 360 px gibt es kein horizontales Scrollen.
- Mobile nutzt keinen künstlichen Phone-Rahmen.

## Funktion

- Registrierung, Login, Logout und Passwort-Reset funktionieren.
- Geschützte Routen sind wirklich geschützt.
- Jeder Nutzer sieht ausschließlich eigene Daten.
- Bohnen können erstellt, bearbeitet und archiviert werden.
- Maschine und Mühle können gespeichert und als Default gesetzt werden.
- Letzte Bohne, Default-Maschine, Default-Mühle und Default-Tools werden im Shot-Flow vorausgefüllt.
- Ein Shot kann bei passenden Defaults in unter 30 Sekunden dokumentiert werden.
- Timer und manuelle Zeiteingabe funktionieren parallel.
- Stop-Gewicht und finales Gewicht werden getrennt gespeichert.
- Brew Ratio und Nachlauf werden live beziehungsweise korrekt berechnet.
- Score ändert sich live und wird serverseitig verifiziert.
- Dashboard und Historie aktualisieren sich nach dem Speichern ohne kompletten Reload.
- Sweet-Spot-Chart verwendet echte Supabase-Daten.
- Filter funktionieren.
- Dial-in-Empfehlung ist regelbasiert und nachvollziehbar.
- Alle Kerndaten bleiben nach Reload und erneutem Login erhalten.

## Qualität

- Keine TypeScript-Fehler.
- Kein unkontrolliertes `any`.
- Lint erfolgreich.
- Tests erfolgreich.
- Produktions-Build erfolgreich.
- Keine Secrets committed.
- Keine fehlenden RLS-Policies.
- Keine TODOs in Kernfunktionen.

---

# 21. Erwarteter Abschlussbericht

Nachdem du alles implementiert hast:

1. Führe Installation, Migrationen beziehungsweise lokale Datenbankprüfung, Lint, Typecheck, Tests und Production Build aus.
2. Behebe alle gefundenen Fehler.
3. Liste knapp auf:
   - welche Bereiche umgesetzt wurden;
   - welche Migrationen erstellt wurden;
   - welche Befehle erfolgreich liefen;
   - welche Environment Variables noch vom Nutzer gesetzt werden müssen;
   - wie die App lokal gestartet wird;
   - wie sie auf Vercel deployed wird.
4. Nenne nur echte verbleibende Einschränkungen. Behaupte keine erfolgreiche Prüfung, die du nicht ausgeführt hast.

Beginne jetzt mit dem vollständigen Lesen der fünf Referenzdateien und setze anschließend die Anwendung vollständig um. Verändere das Design nicht eigenmächtig.
