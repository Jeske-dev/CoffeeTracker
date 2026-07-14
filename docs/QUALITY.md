# Qualität und Tests

## Lokale Prüfung

Vor einem Merge oder Deployment müssen diese Befehle erfolgreich sein:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Für Browser-Flows zusätzlich:

```bash
npm run test:e2e
```

Playwright benötigt einmalig `npx playwright install chromium`. Authentifizierte End-to-End-Flows dürfen nur gegen ein isoliertes Supabase-Testprojekt laufen.

## Testaufteilung

| Ebene | Zweck | Beispiele |
| --- | --- | --- |
| Reine Unit Tests | Regeln, Parser, Defaults und View Models ohne DOM | `form-model.test.ts`, `comparison-series.test.ts`, Recommendation Engine |
| Komponenten-Tests | Zugängliche Interaktion, Formzustand und Mutation Calls | Shot Wizard, Shot Edit, Setup Autosave, Shot History |
| Integrations-Tests | Cache-Isolation, Optimistic Rollback, API-Header und Navigation | `src/lib/cache`, Provider und App Shell |
| E2E/Visual | Routing, responsive Layouts, Überläufe und echte Browser APIs | `e2e` mit Chromium |
| Production Build | RSC-Grenzen, Route Types, Bundling und Next.js-Konventionen | `npm run build` |

Tests sollen beobachtbares Verhalten prüfen. Interne Komponentenstruktur oder Tailwind-Klassen werden nur getestet, wenn sie einen konkreten Layout- oder Zustandsvertrag darstellen.

## Neue Shot-Felder

Ein neues persistiertes Shot-Feld erfordert bewusst alle folgenden Schritte:

1. Vorwärtsgerichtete Supabase-Migration mit Constraint und gegebenenfalls Index anlegen.
2. `src/types/database.ts` regenerieren oder passend aktualisieren.
3. Domain-Typ in `src/types/domain.ts` ergänzen.
4. Explizite Spaltenlisten in `src/features/data/columns.ts` prüfen.
5. Datenbankzeile in `src/features/data/normalize.ts` normalisieren.
6. Zod-Schema und Create-/Edit-Defaults ergänzen.
7. Eine zentrale UI-Sektion oder Kontrolle erweitern; keine zweite Feldimplementierung anlegen.
8. Server Action inklusive Ownership und Null-Verhalten aktualisieren.
9. Unit-, Create-, Edit- und Detailtests ergänzen.
10. Mobile und Desktop visuell prüfen.

Felder, die nur für ein Diagramm benötigt werden, gehören nicht automatisch in Client Props. Zuerst prüfen, ob ein serverseitiges View Model die Daten reduzieren kann.

## Visuelle Prüfung

Mindestens diese Viewports prüfen:

- Mobile: 390 × 844
- kleines Mobile: 360 × 800
- Desktop: 1280 × 900

Zu kontrollieren sind:

- kein horizontaler Seiten-Overflow
- keine überlappenden Labels, Werte oder Footer
- alle Touch-Ziele mindestens 44 × 44 Pixel
- Fokuszustände und zugängliche Namen für Icon-Buttons
- stabile Diagrammfläche mit und ohne Daten
- lange Bohnen-, Rösterei- und Equipmentnamen
- Flaggen- und Equipment-Icons in Liste, Auswahl und Detailansicht
- Fehlermeldungen, Loading Skeletons, Empty States und Offline-Zustand

Für Canvas- oder SVG-Diagramme reicht ein Screenshot allein nicht: Zusätzlich prüfen, dass die gerenderte Fläche nicht leer ist und Datenpunkte innerhalb des sichtbaren Bereichs liegen.

## Datenbank und Sicherheit

Migrationen lokal oder gegen ein Testprojekt prüfen:

```bash
npx supabase db reset
# oder nach bewusstem Link auf das Zielprojekt
npx supabase db push --dry-run
```

RLS-Tests müssen mindestens sicherstellen, dass Tabellen RLS aktiviert haben und Nutzer nur eigene Zeilen lesen beziehungsweise verändern können. Logs dürfen keine Tokens, Cookies, E-Mail-Adressen oder Shot-Inhalte enthalten.

## Performance

Bei einer Route werden Query-Anzahl, ausgewählte Spalten, Zeilenlimit und Client-Payload gemeinsam bewertet. Vollständige Domainobjekte sollen nicht an eine Client Component übergeben werden, wenn wenige abgeleitete Werte genügen.

Für Änderungen an Navigation oder Datenladung prüfen:

- keine doppelte Anfrage direkt nach Hydration
- kein unnötiges `router.refresh()` nach lokaler Cache-Aktualisierung
- keine künstlichen Suspense Boundaries um dasselbe Promise
- keine Formatter oder großen Arrays, die pro Render ohne Bedarf neu erzeugt werden
- kein Polling ohne Produktanforderung

Die historische Baseline und Query-Reduktion stehen in [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md).

## Definition of Done

Eine Änderung ist fertig, wenn Verhalten, Fehlerzustände und relevante Randfälle getestet sind, TypeScript und ESLint ohne Warnungen laufen, der Production Build erfolgreich ist, die Dokumentation den neuen Vertrag beschreibt und keine temporären Test-Routen oder Screenshots im Commit verbleiben.
