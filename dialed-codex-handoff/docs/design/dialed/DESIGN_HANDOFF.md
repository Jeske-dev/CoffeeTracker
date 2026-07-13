# Dialed – Design- und Produkt-Handoff

## 1. Produktidee

**Dialed** ist ein Mobile-First Brew Journal für Siebträger-Espresso. Es reduziert die Dateneingabe auf drei klar getrennte Momente:

1. **Setup** – Bohne, Maschine, Mühle, Mahlgrad, Dosis und Puck-Prep.
2. **Extraktion** – Live-Timer oder manuelle Zeit, Gewicht beim Stoppen der Pumpe und finales Getränkgewicht.
3. **Review** – Geschmack, Flow/Channeling, Puck-Zustand, Notiz und automatisch abgeleiteter Shot-Score.

Das Produkt soll nicht wie eine technische Labor-App wirken. Es verbindet präzise Messwerte mit einer ruhigen, hochwertigen Kaffee-Ästhetik.

## 2. Informationsarchitektur

### Hauptnavigation

- **Heute**: Dashboard, Schnellstart, Sweet-Spot-Chart, Kennzahlen, Handlungsempfehlung und letzte Shots.
- **Shots**: Vollständige Historie, Filter nach Sweet Spot, sauer und bitter.
- **Bohnen**: Zuletzt verwendete Bohne, Sammlung und Hinzufügen neuer Bohnen.
- **Setup**: Standardmaschine, Standardmühle, automatische Vorauswahl, Standard-Puck-Prep und smarte Hinweise.

### Primäre Aktion

„Shot starten“ öffnet einen Vollbild-Flow. Der Nutzer verlässt den Kontext nicht und kann mit einer Hand durch den Prozess gehen.

## 3. Designprinzipien

- **Minimal statt leer**: Jede Karte beantwortet eine konkrete Frage.
- **Vorausfüllen statt wiederholen**: Maschine, Mühle, Bohne und Tools werden aus dem letzten Shot bzw. den Standards übernommen.
- **Progressive Disclosure**: Temperatur, Herkunft, Aufbereitung und Notizen sind optional.
- **Messwert + Bedeutung**: Zahlen werden mit Geschmack und visueller Diagnose verknüpft.
- **Einhandbedienung**: Primäre Aktionen liegen im unteren Bildschirmbereich; Touch-Ziele mindestens 44 px.

## 4. Visuelles System

### Farb-Tokens

```css
--canvas: #EEE6DC;
--surface: #FBF8F3;
--surface-2: #F3ECE4;
--ink: #241914;
--muted: #8D7E74;
--espresso: #2B1B16;
--crema: #C8804F;
--crema-soft: #F0D7C5;
--sage: #6F806F;
--sage-soft: #DFE7DC;
--rose: #A95F52;
```

### Typografie

- Display/Editorial: **Newsreader**, **Lora** oder **Fraunces**.
- UI/Text: **Inter**, **Manrope** oder System Sans.
- Messwerte/Timer: **SF Mono**, **JetBrains Mono** oder System Mono.

### Formensprache

- Große Karten: 24–30 px Radius.
- Kleine Karten und Felder: 13–18 px Radius.
- Pills/Buttons: vollständig rund.
- Schatten warm und zurückhaltend; keine harten schwarzen Schatten.
- Linien: 1 px mit ca. 8–12 % Deckkraft.

## 5. Kern-Screens

### Dashboard

- Begrüßung und Datum.
- Dunkle Hero-Karte mit zuletzt verwendeter Bohne und „Shot starten“.
- Scatterplot: x = Extraktionszeit, y = finales Getränkgewicht, Punktfarbe = Geschmack.
- Markierter Zielkorridor („Sweet Spot“), idealerweise je Bohne konfigurierbar.
- Kennzahlen: durchschnittliches Brew Ratio, Durchschnittszeit, aktuelle Shot-Serie.
- Automatischer Dial-in-Hinweis, z. B. „ein Tick feiner mahlen“.
- Letzte vier Extraktionen mit Score, Dose → Yield, Zeit und Geschmack.

### Bohnen

Pflichtfelder:
- Name
- Rösterei/Hersteller
- Röstdatum

Optionale Felder:
- Herkunft
- Aufbereitung
- Röstgrad
- Tasting Notes
- Kaufdatum, Preis, Packungsgröße
- Entkoffeiniert

Zusätzlich sinnvoll:
- Alter in Tagen automatisch berechnen.
- Bohne nach Verbrauch archivieren.
- Bestes Rezept pro Bohne anzeigen.

### Neuer Shot – Schritt 1: Setup

- Letzte Bohne vorausgewählt.
- Standardmaschine und Standardmühle vorausgewählt.
- Mahlgrad und Dosis.
- Optional: Brühtemperatur, Siebgröße, Preinfusion.
- Puck-Prep als große Toggles: WDT, Tamper, Puck Screen, Leveler, Papierfilter.

### Neuer Shot – Schritt 2: Extraktion

- Großer Live-Timer mit Start/Stop/Reset.
- Zeit ist jederzeit manuell korrigierbar.
- **Pumpe gestoppt bei** – Gewicht beim Betätigen des Stopps.
- **Finales Gewicht** – Getränkgewicht nach Nachlauf.
- Live berechnetes Brew Ratio.
- Daraus ableitbar: Nachlauf = finales Gewicht − Stop-Gewicht.

### Neuer Shot – Schritt 3: Review

- Geschmacksskala: sehr sauer → balanciert → sehr bitter.
- Flow: gleichmäßig, leichtes Channeling, starkes Channeling, Spritzing.
- Puck: zu trocken, ideal, sehr nass, am Duschsieb hängengeblieben.
- Freitextnotiz.
- Shot-Score als motivierende, aber transparente Zusammenfassung.

## 6. Datenmodell

```ts
type Bean = {
  id: string;
  name: string;
  roaster: string;
  roastDate: string;
  origin?: string;
  process?: 'washed' | 'natural' | 'honey' | 'anaerobic' | 'unknown';
  roastLevel?: 'light' | 'medium-light' | 'medium' | 'dark';
  tastingNotes?: string[];
  archivedAt?: string;
};

type Equipment = {
  id: string;
  type: 'machine' | 'grinder' | 'basket' | 'tool';
  name: string;
  isDefault: boolean;
};

type Shot = {
  id: string;
  createdAt: string;
  beanId: string;
  machineId: string;
  grinderId: string;
  grindSetting: number | string;
  doseGrams: number;
  temperatureCelsius?: number;
  prepTools: string[];
  extractionSeconds: number;
  stopWeightGrams: number;
  finalYieldGrams: number;
  taste: 'very-sour' | 'sour' | 'balanced' | 'bitter' | 'very-bitter';
  flow: 'even' | 'minor-channeling' | 'channeling' | 'spritzing';
  puck: 'dry' | 'ideal' | 'wet' | 'stuck';
  notes?: string;
  score?: number;
};
```

Abgeleitete Werte:

```ts
brewRatio = finalYieldGrams / doseGrams;
postStopDrip = finalYieldGrams - stopWeightGrams;
roastAgeDays = shotDate - bean.roastDate;
```

## 7. Smarte Auswertung

Die erste Version sollte Empfehlungen regelbasiert und nachvollziehbar formulieren:

- **Sauer + schnell + hohes Ratio** → feiner mahlen oder Yield reduzieren.
- **Sauer + langsam** → Temperatur erhöhen oder längere Bohnenruhe prüfen.
- **Bitter + langsam** → gröber mahlen oder früher stoppen.
- **Channeling** → Puck-Prep priorisieren; keine reine Mahlgrad-Empfehlung.
- **Hoher Nachlauf** → früheren Stop-Zielwert aus historischen Daten vorschlagen.

Später kann ein persönliches Modell pro Bohne lernen, welche Parameter bei diesem Nutzer zu „balanciert“ führen.

## 8. Animationen

- Hero-Bohne schwebt minimal.
- Timer-Ring füllt sich bis ca. 40 Sekunden.
- Vollbild-Flow fährt von unten ein.
- Beim Speichern: kurzer Erfolgstoast; optional subtile Crema-Partikel.
- Chart-Punkte erscheinen nacheinander.
- `prefers-reduced-motion` respektieren.

## 9. Empfohlene MVP-Priorität

1. Shot-Flow mit lokaler Speicherung.
2. Bohnen-CRUD und Standard-Equipment.
3. Historie und Filter.
4. Dashboard-Scatterplot und Kennzahlen.
5. Regelbasierte Dial-in-Hinweise.
6. Export/Import als JSON oder CSV.
7. Optional: Cloud Sync, Login und Teilen von Rezepten.

## 10. Prompt für einen Code-Generator

> Baue eine produktionsreife, mobile-first Web-App namens „Dialed“ für das Tracking von Siebträger-Espresso. Nutze React + TypeScript + Vite, Tailwind CSS, shadcn/ui, React Hook Form, Zod und Recharts. Das visuelle Design ist warm, minimalistisch und editorial: heller Creme-Hintergrund, dunkles Espresso-Braun, Crema-Orange und Salbei-Grün. Übernimm Informationsarchitektur, Datenmodell, Design-Tokens und Interaktionen aus diesem Handoff sowie den bereitgestellten HTML-Prototypen. Implementiere vier Haupttabs: Heute, Shots, Bohnen und Setup. Der primäre Flow „Neuer Shot“ hat drei Schritte: Setup, Extraktion mit Live-Timer sowie Review. Maschine, Mühle und letzte Bohne müssen vorausgefüllt werden. Speichere Stop-Gewicht und finales Gewicht getrennt. Berechne Brew Ratio und Nachlauf live. Nutze zunächst IndexedDB oder LocalStorage mit sauberer Repository-Abstraktion, damit später Supabase ergänzt werden kann. Baue zugängliche Touch-Ziele, Tastaturnavigation, reduzierte Bewegung, leere Zustände, Formularvalidierung und responsive Desktop-Darstellung. Keine generischen Dashboard-Templates; halte die Karten großzügig, ruhig und kaffee-spezifisch.

## 11. Akzeptanzkriterien

- Ein Shot kann in unter 30 Sekunden dokumentiert werden, wenn Standardwerte stimmen.
- Timer und manuelle Zeiteingabe funktionieren parallel.
- Stop-Gewicht und finales Gewicht werden unabhängig gespeichert.
- Letzte Bohne, Maschine, Mühle und Tools werden korrekt vorausgewählt.
- Bohnen können hinzugefügt und in einem neuen Shot direkt gewählt werden.
- Dashboard und Historie aktualisieren sich nach dem Speichern ohne Neuladen.
- Alle Kerndaten bleiben nach einem Reload erhalten.
- Auf 360 px Breite gibt es kein horizontales Scrollen.
