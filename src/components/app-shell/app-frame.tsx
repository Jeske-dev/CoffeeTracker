import { BottomNav } from "./bottom-nav";
import { OfflineNotice } from "@/components/pwa/offline-notice";
import { PrivateSwrProvider } from "@/components/providers/private-swr-provider";
export function AppFrame({children}:{children:React.ReactNode}){return <PrivateSwrProvider><div className="app-shell" aria-label="Dialed App"><main className="app-viewport screen-in">{children}</main><OfflineNotice/><BottomNav/></div></PrivateSwrProvider>}
