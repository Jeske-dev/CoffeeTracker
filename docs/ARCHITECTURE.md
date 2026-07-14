# Dialed Architektur

Dieses Dokument beschreibt den aktuellen Aufbau der Anwendung und die Grenzen, an denen neue Funktionalität ergänzt werden soll. Ziel ist eine server-first App mit kleinen interaktiven Inseln, nachvollziehbarer Fachlogik und genau einer Quelle pro Regel.

## Überblick

```text
Browser
  -> Next.js Route / Server Component
    -> Feature Query oder Server Action
      -> Supabase Client
        -> Postgres + Row Level Security

Serverdaten
  -> reines Feature-View-Model
    -> kleine serialisierbare Props
      -> interaktive Client Component
```

## Schichten

| Schicht | Ort | Verantwortung |
| --- | --- | --- |
| Routing und Komposition | `src/app` | Authentifizierung anfordern, Datenladung starten, Loading Boundary setzen und Seiten zusammensetzen |
| Datenzugriff | `src/features/data` | Explizite Supabase-Spalten, Normalisierung, Query-Aggregate und autorisierte Mutationen |
| Fachlogik | `src/features/shots`, `src/features/setup`, `src/features/recommendations` | Defaults, View Models, Regeln, Autosave und Zustandsübergänge ohne Präsentationsdetails |
| Feature UI | `src/components/beans`, `dashboard`, `setup`, `shots` | Nutzerinteraktion und domänenspezifische Darstellung |
| Gemeinsame UI | `src/components/ui`, `src/components/entities` | Wiederverwendbare Karten, Metriken, Eingaben und konsistente Entity-Icons |
| Gemeinsame Infrastruktur | `src/lib`, `src/hooks` | Formatierung, Validierung, Cache, Supabase, Draft Storage und technische Hooks |
| Datenbank | `supabase/migrations` | Schema, Constraints, Trigger, Indizes und RLS-Policies |

Abhängigkeiten zeigen nach innen: Komponenten dürfen Feature-Funktionen verwenden, reine Feature-Funktionen kennen jedoch keine React-Komponenten. Datenbankzeilen werden in `src/features/data/normalize.ts` in das kleinere App-Domain-Modell übersetzt.

## Server und Client

Routen bleiben standardmäßig Server Components. Eine Seite ruft zuerst `requireUser()` auf und startet anschließend genau die für diese Route passende Query aus `src/features/data/queries.ts`. Client Components werden nur für Formulare, SWR, Local Storage oder Diagrammbibliotheken eingesetzt.

Das Dashboard startet `loadDashboardData()` ohne vorheriges `await` und übergibt das Promise an eine sinnvolle Suspense Boundary. Die Dashboard-Sektionen hängen vom selben Query-Aggregat ab; mehrere Boundaries um dasselbe Promise würden kein zusätzliches Streaming erzeugen.

Diagrammdaten werden vor der Client-Grenze reduziert:

- `buildTimeRatioSeries()` erzeugt maximal zehn Dashboard-Punkte, sichere Achsenbereiche und hält den festen Optimalraum von 20–30 Sekunden bei einer Ratio von 1:1,9–1:2,1 sichtbar.
- `buildShotComparisonSeries()` reduziert bis zu zwanzig vollständige Shot-Zeilen auf maximal elf kleine Punkte.
- Recharts erhält nur serialisierbare View Models und enthält keine fachliche Filterlogik.

## Shot Workflow

`src/features/shots/form-model.ts` ist die zentrale Quelle für:

- Create- und Edit-Defaults
- auswählbare Bohnen und gruppiertes Equipment
- Wiederherstellung bereinigter Drafts
- erlaubte manuelle Rezeptänderungen
- Mahlgrad-Schritte und optimistische Shot-Daten

`ShotWizard` und `ShotEditForm` verwenden dieselben Präsentationsbausteine:

- `shot-sections.tsx` definiert die visuelle Abschnittsstruktur.
- `shot-form-panels.tsx` verdrahtet Extraktion, Geschmack, Flow und Puck genau einmal.
- `shot-form-controls.tsx` enthält die eigentlichen Eingabekontrollen.
- `shot-option-icons.ts` hält die gemeinsame Icon-Zuordnung für Eingabe und Detailansicht.
- `shot-visuals.tsx` enthält read-only und interaktive Darstellungen für Gewichtsverlauf und Geschmack.
- `stop-weight-tip.ts` berechnet den operativen Stopppunkt als reines, separat getestetes Domain-Modell.

Der Create Flow ist:

1. Defaults aus Setup und letztem Shot erstellen.
2. Einen validierten lokalen Draft wiederherstellen und danach debounced speichern.
3. Vor jedem Schritt nur dessen Pflichtfelder prüfen.
4. Beim Absenden nur Dosis, Mahlgrad und Stop-Gewicht als manuelle Rezeptänderung markieren.
5. Die Shot-Liste optimistisch ergänzen und bei einem Fehler automatisch zurückrollen.
6. Serverseitig erneut mit Zod validieren, Ownership prüfen und unter RLS speichern.
7. Cache-Keys gezielt invalidieren, Draft löschen und zum Dashboard wechseln.

Die fünf Geschmacksstufen sind eine UI-Projektion auf die bestehenden Felder `taste` und `overallTasteRating`. Diese Abbildung liegt ausschließlich in `src/lib/taste-scale.ts`.

Für den Stopptipp lädt die bestehende New-Shot-Abfrage bis zu 20 kompakt an den Client weitergereichte Historienwerte. Exakte Treffer verwenden Bohne, Mühle und normalisierten Mahlgrad. Ohne exakten Treffer wird der Nachlaufanteil ähnlicher Shots per Dreisatz auf das aktuelle finale Zielgewicht skaliert; ohne valide Historie dient 34 g Stop zu 36 g final als ausdrücklich gekennzeichneter Startwert. Der Tipp verändert keine Formulareingabe automatisch.

## Setup Autosave

Das geteilte Schema in `src/features/setup/schema.ts` validiert Client und Server identisch. `use-setup-autosave.ts` kapselt die Autosave-Zustandsmaschine:

- Textfelder speichern nach Blur oder kurzer Inaktivität.
- Schalter und Puck-Prep-Auswahl speichern unmittelbar.
- Saves laufen seriell, damit eine langsamere ältere Anfrage keine neuere Einstellung überschreibt.
- Nur der aktuellste Fehler wird angezeigt.
- Nach einem Verbindungsfehler wird online automatisch erneut versucht.
- Ein Cache-Invalidierungsfehler macht einen bereits erfolgreichen Datenbank-Save nicht rückgängig.

## Empfehlungen

Die Recommendation Engine ist eine deterministische Rule Engine. Sie erzeugt intern höchstens eine primäre Änderung. Das normale UI zeigt daraus ausschließlich Dosis, Mahlgrad und Stop-Gewicht als Zielwerte.

Wichtige Invarianten:

- Empfehlungen verändern Formularwerte niemals automatisch.
- Dosis, Mahlgrad und Stop-Gewicht sind die einzigen protokollierten Rezeptänderungen.
- Allgemeine Tippkarten und ihre alten Apply-, Dismiss- und Feedback-Aktionen gehören nicht mehr zum Produktfluss.
- Das Speichern eines Shots erzeugt die nächste Empfehlung asynchron über Next.js `after()`.
- Score und Datenabdeckung bleiben intern für Vergleich und Engine erhalten, sind aber kein primäres UI-Merkmal.

## Persistenz und Sicherheit

Server Actions validieren IDs und Payloads erneut, obwohl die Clientformulare bereits validieren. Referenzen auf Bohne und Equipment werden vor dem Schreiben auf den aktuellen Nutzer geprüft. Supabase RLS ist die letzte Autorisierungsgrenze.

`NEXT_PUBLIC_SUPABASE_URL` und der Publishable Key dürfen im Client verfügbar sein. Service-Role-Keys gehören niemals in `NEXT_PUBLIC_*`, Clientcode oder das Repository.

Alle Datenbankänderungen erfolgen über neue, vorwärtsgerichtete Migrationen. Historische Migrationen werden nach einem Deployment nicht bearbeitet.

## Cache

Private SWR-Keys enthalten immer die User-ID. Servergeladene Daten werden als Fallback gesetzt, damit die Hydration keine identische Anfrage wiederholt. Mutationen invalidieren nur betroffene Ressourcen. Private API-Antworten bleiben `private, no-store`; Logout leert den In-Memory-Cache.

## UI-Konventionen

- Entity-Icons kommen aus `src/components/entities/entity-icons.tsx`; Bohnen verwenden bei bekannter Herkunft überall dieselbe Flagge.
- Abschnittskarten verwenden `SectionCard`, wiederkehrende Label-Wert-Blöcke `DataMetric` oder `LabeledValue`.
- Optionen für Geschmack, Flow, Puck und Puck-Prep liegen in zentralen Konstanten statt in einzelnen Screens.
- Buttons mit bekannten Aktionen verwenden Lucide Icons und einen zugänglichen Namen.
- Größen für Diagramme, Icon-Frames, Umschalter und Eingabefelder bleiben stabil, damit dynamische Inhalte kein Layout verschieben.
- Nutzerdaten werden abgeschnitten oder umgebrochen; sie dürfen keine Controls überdecken.

## Erweiterungen

Eine neue Funktion beginnt in der kleinsten passenden Feature-Grenze. Eine Abstraktion ist sinnvoll, wenn sie eine fachliche Regel zentralisiert, echte Wiederholung entfernt oder Serverdaten vor der Client-Grenze reduziert. Reine Einmal-Wrapper ohne eigenes Verhalten werden vermieden.

Der konkrete Prüfablauf für Änderungen steht in [QUALITY.md](QUALITY.md).
