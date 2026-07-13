const COUNTRY_CODES: Record<string, string> = {
  bolivien: "BO",
  bolivia: "BO",
  brasilien: "BR",
  brazil: "BR",
  burundi: "BI",
  china: "CN",
  athiopien: "ET",
  columbia: "CO",
  colombia: "CO",
  colombien: "CO",
  "costa rica": "CR",
  costarica: "CR",
  "dominikanische republik": "DO",
  "dominican republic": "DO",
  "dr kongo": "CD",
  ecuador: "EC",
  "el salvador": "SV",
  elsalvador: "SV",
  elfenbeinkueste: "CI",
  elfenbeinkuste: "CI",
  elfenbeinküste: "CI",
  ethiopien: "ET",
  ethiopia: "ET",
  guatemala: "GT",
  honduras: "HN",
  indien: "IN",
  india: "IN",
  indonesia: "ID",
  indonesien: "ID",
  jamaica: "JM",
  jamaika: "JM",
  jemen: "YE",
  yemen: "YE",
  kamerun: "CM",
  cameroon: "CM",
  kenia: "KE",
  kenya: "KE",
  kolumbien: "CO",
  kongo: "CD",
  mexico: "MX",
  mexiko: "MX",
  nicaragua: "NI",
  panama: "PA",
  panamá: "PA",
  "papua neuguinea": "PG",
  "papua new guinea": "PG",
  peru: "PE",
  ruanda: "RW",
  rwanda: "RW",
  tansania: "TZ",
  tanzania: "TZ",
  thailand: "TH",
  uganda: "UG",
  vietnam: "VN",
  äthiopien: "ET",
};

function normalizeOrigin(origin: string) {
  return origin.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function codeToFlag(code: string) {
  return [...code.toUpperCase()].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join("");
}

export function flagForOrigin(origin: string | null | undefined) {
  if (!origin) return null;
  const normalized = normalizeOrigin(origin);
  const code = COUNTRY_CODES[normalized] ?? Object.entries(COUNTRY_CODES).find(([country]) => normalized.includes(country) || country.includes(normalized))?.[1];
  return code ? codeToFlag(code) : null;
}
