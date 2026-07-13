# Verwendung mit Codex

1. Kopiere den gesamten Inhalt dieses Ordners in das Root-Verzeichnis deines Git-Repositories.
2. Öffne das Repository in Codex.
3. Füge den vollständigen Inhalt von `CODEX_PROMPT.md` als Aufgabe ein.
4. Lass die Referenzdateien unter `docs/design/dialed/` unverändert im Repository, damit Codex Bilder, HTML-Prototyp und Design-Tokens direkt vergleichen kann.
5. Setze später die Supabase-Variablen aus `.env.example` in `.env.local` und in Vercel.

Der Prompt weist Codex ausdrücklich an, nicht nach einem Plan oder einem bloßen Scaffold aufzuhören, sondern Migrationen, Auth, UI, Tests und Build vollständig umzusetzen.
