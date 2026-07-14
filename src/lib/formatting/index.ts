import type { ShotTaste } from "@/types/domain";

const decimal = (digits: number) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const formatWeight = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${decimal(1).format(value)} g`;
export const formatTime = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${decimal(1).format(value)} s`;
export const formatRatio = (value: number | null | undefined) => value === null || value === undefined ? "—" : `1 : ${decimal(2).format(value)}`;
export const formatDateTime = (value: string | Date) => new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
export const formatDate = (value: string | Date) => new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
export const tasteLabel = (taste: ShotTaste | null) => taste ? ({ sour: "Zu sauer", balanced: "Ausgewogen", bitter: "Zu bitter" })[taste] : "Nicht angegeben";
