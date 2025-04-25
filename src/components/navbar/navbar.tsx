import Logo from "../logo";
import { Suspense } from "react";
import UpdateDialog from "../misc/update-dialog";
import SystemStatus from "../misc/system-status";
import Links from "./links.server";
import { Moon } from "lucide-react";
import Hydrated from "../hydrated";
import GuestThemeSwitch from "./guest-theme-switch";
import ArtistSelector from "./artist-selector";

export default async function Navbar() {
  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-30">
      <div className="glass">
        <div className="flex w-full items-center h-14">
          <div className="container lg:grid lg:grid-cols-3 flex items-center gap-2 text-sm text-foreground lg:gap-4 lg:py-6 pointer-events-auto">
            <div className="flex gap-4 items-center">
              <Logo className="h-10" />
              <div className="relative flex items-center">
                <SystemStatus />
                <UpdateDialog />
              </div>
            </div>

            <Suspense>
              <Links />
            </Suspense>

            <div className="flex grow-0 items-center justify-end gap-2">
              <Hydrated
                fallback={
                  <div className="inline-flex items-center h-9 px-1">
                    <Moon className="size-8" />
                  </div>
                }
              >
                <GuestThemeSwitch />
              </Hydrated>

              <Suspense>
                <ArtistSelector />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
      <div className="glass-edge"></div>
    </nav>
  );
}
