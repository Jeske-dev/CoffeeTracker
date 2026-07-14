"use client";
import Link from "next/link";
import { Home, ListFilter, Settings, Sprout } from "lucide-react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const items = [{href:"/app",label:"Heute",icon:Home},{href:"/app/shots",label:"Shots",icon:ListFilter},{href:"/app/beans",label:"Bohnen",icon:Sprout},{href:"/app/setup",label:"Setup",icon:Settings}];
export function BottomNav(){const pathname=usePathname();const router=useRouter();useEffect(()=>{for(const{href}of items)router.prefetch(href)},[router]);return <nav className="z-30 grid shrink-0 grid-cols-4 border-t border-black bg-white pb-[env(safe-area-inset-bottom)]" aria-label="Hauptnavigation">{items.map(({href,label,icon:Icon})=>{const active=href==="/app"?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} prefetch className={`grid min-h-16 place-items-center content-center gap-1 border-r border-[var(--crema-outline-soft)] text-[9px] font-semibold tracking-[.08em] uppercase last:border-r-0 ${active?"bg-black text-white":"text-[var(--dialed-text-secondary)] hover:bg-[var(--crema-surface-low)] hover:text-black"}`}><Icon className="size-5"/><span>{label}</span></Link>})}</nav>}
