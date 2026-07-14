import { AppFrame } from "@/components/app-shell/app-frame";
export const preferredRegion = "fra1";
export default function ProtectedLayout({children}:{children:React.ReactNode}){return <AppFrame>{children}</AppFrame>}
