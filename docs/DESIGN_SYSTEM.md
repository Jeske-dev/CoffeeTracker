# Monochrome Crema

Dialed verwendet ein minimalistisches, architektonisches Designsystem für datenorientiertes Espresso-Tracking. Die visuelle Ebene bleibt von Datenzugriff, Formularzustand und Feature-Logik getrennt.

## Grundlagen

- **Typografie:** Playfair Display für Seiten- und Abschnittsüberschriften, Inter für Navigation, Controls, Fließtext und tabellarische Messwerte.
- **Farben:** `#f9f9f9` als App-Fläche, Weiß für Inhalte, Schwarz für primäre Aktionen und Hierarchie sowie abgestufte Grautöne für sekundäre Flächen und Text.
- **Semantik:** Rot wird ausschließlich für echte Fehler, ungültige Eingaben und destruktive Aktionen verwendet. Erfolgs- und Auswahlzustände nutzen Schwarz, Kontur oder Invertierung.
- **Formen:** UI-Elemente haben 0 px Radius. Organische Formen sind nur innerhalb inhaltlicher Icons erlaubt.
- **Tiefe:** Keine Schatten, Verläufe, Transparenzflächen oder Glassmorphism-Effekte. 1-px-Linien und Weißraum schaffen Hierarchie.
- **Rhythmus:** Abstände folgen einem 8-px-Grundraster. Mobile Seitenränder betragen mindestens 24 px.

## Tokens

Die kanonischen `--crema-*`-Tokens stehen in `src/app/globals.css`. Vorhandene `--dialed-*`-Variablen bleiben dort als visuelle Aliase erhalten. Dadurch kann das Design zentral geändert werden, ohne Feature-Code oder Datenflüsse anzufassen.

Wichtige Rollen:

| Rolle | Token | Wert |
| --- | --- | --- |
| App-Hintergrund | `--crema-surface` | `#f9f9f9` |
| Inhalt | `--crema-surface-bright` | `#ffffff` |
| Sekundärfläche | `--crema-surface-low` | `#f3f3f4` |
| Primärfarbe | `--crema-ink` | `#000000` |
| Fließtext | `--crema-text` | `#1a1c1c` |
| Sekundärtext | `--crema-text-secondary` | `#5d5f5f` |
| Hilfstext | `--crema-text-muted` | `#6b6b6b` |
| Dezente Linie | `--crema-outline-soft` | `#dadada` |
| Fehler | `--crema-error` | `#ba1a1a` |

Der Hilfstext ist gegenüber der ursprünglichen Referenz leicht abgedunkelt, damit kleine Labels auch auf grauen Flächen WCAG-AA-Kontrast erreichen.

## Komponentenregeln

- Primärbuttons sind schwarz mit weißem Text; sekundäre Buttons haben eine schwarze Kontur.
- Inputs verwenden bevorzugt eine untere Linie. Fokus verstärkt die Linie auf 2 px.
- Karten sind einzelnen wiederholten Datensätzen oder klar gerahmten Werkzeugen vorbehalten. Seitenabschnitte bleiben ungerahmt oder werden durch horizontale Linien getrennt.
- Binäre Einstellungen verwenden den gemeinsamen scharfkantigen `Switch`; Optionsgruppen verwenden invertierte Segmente.
- Lucide-Icons werden mit 1,5 px Strichstärke dargestellt. Bohnen- und Equipment-Identitäten laufen über `src/components/entities/entity-icons.tsx`.
- Messwerte verwenden tabellarische Ziffern. Farbe darf nie die einzige Information über einen Zustand tragen.
- Diagramme verwenden Konturen, Graustufen und unterschiedliche Formen. Der Zielbereich ist eine graue Fläche mit schwarzer Kontur.

## Erweiterungen prüfen

Vor dem Merge einer neuen Oberfläche:

1. Auf 320 px, 390 px, Tablet und Desktop auf horizontalen Überlauf und Textüberschneidungen prüfen.
2. Lange deutsche Beschriftungen und leere Zustände testen.
3. Tastaturfokus, Touch-Ziele von mindestens 44 px und semantische Labels kontrollieren.
4. `npm run lint`, `npm run typecheck`, `npm test` und `npm run build` ausführen.
5. Nach neuen Rundungen, Schatten, Verläufen und nicht-semantischen Farben suchen.
