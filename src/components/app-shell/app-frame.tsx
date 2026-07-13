import { BottomNav } from "./bottom-nav";
export function AppFrame({children}:{children:React.ReactNode}){return <div className="app-shell" aria-label="Dialed App"><main className="app-viewport screen-in">{children}</main><BottomNav/></div>}
