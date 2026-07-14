"use client";
import Link from "next/link";
import { Home, ListFilter, Settings, Sprout } from "lucide-react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const items = [{href:"/app",label:"Heute",icon:Home},{href:"/app/shots",label:"Shots",icon:ListFilter},{href:"/app/beans",label:"Bohnen",icon:Sprout},{href:"/app/setup",label:"Setup",icon:Settings}];
export function BottomNav(){const pathname=usePathname();const router=useRouter();useEffect(()=>{for(const{href}of items)router.prefetch(href)},[router]);return <nav className="z-30 grid shrink-0 grid-cols-4 border-t bg-[rgba(251,248,243,.94)] px-2 pt-2 pb-[calc(9px+env(safe-area-inset-bottom))] backdrop-blur-lg" aria-label="Hauptnavigation">{items.map(({href,label,icon:Icon})=>{const active=href==="/app"?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} prefetch className={`relative grid min-h-12 place-items-center gap-0.5 text-[9px] ${active?"font-extrabold text-[var(--dialed-espresso)] before:absolute before:-top-2 before:h-[3px] before:w-7 before:rounded-b before:bg-[var(--dialed-crema)]":"text-[var(--dialed-text-muted)]"}`}><Icon className="size-5" strokeWidth={1.8}/><span>{label}</span></Link>})}</nav>}
