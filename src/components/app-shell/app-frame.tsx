import { BottomNav } from "./bottom-nav";
import { OfflineNotice } from "@/components/pwa/offline-notice";
export function AppFrame({children}:{children:React.ReactNode}){return <div className="app-shell" aria-label="Dialed App"><main className="app-viewport screen-in">{children}</main><OfflineNotice/><BottomNav/></div>}
