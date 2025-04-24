import Logo from "../logo";
import { Suspense } from "react";
import UpdateDialog from "../misc/update-dialog";
import SystemStatus from "../misc/system-status";
import Links from "./links.server";
import { AlertTriangle, Moon } from "lucide-react";
import Hydrated from "../hydrated";
import GuestThemeSwitch from "./guest-theme-switch";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
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

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="relative h-8 w-9 flex justify-center items-center rounded-lg bg-orange-500/40 hover:bg-orange-500/60 transition-colors mx-2">
                      <AlertTriangle className="text-orange-500 w-5 h-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="text-xs flex flex-col gap-2">
                    <p className="font-bold">
                      All COSMO connectivity has been removed.
                    </p>
                    <p>
                      Profiles have been migrated to their new Abstract
                      addresses, and ID changes/new accounts will have their IDs
                      synced from COSMO until it gets patched.
                    </p>
                    <p>
                      Due to the blockchain migration, objekt receive times from
                      before the maintenance period are all incorrect. This may
                      be fixed in the future.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Suspense>
              <Links />
            </Suspense>

            <div className="flex grow-0 items-center justify-end gap-2">
              <Suspense>
                <ArtistSelector />
              </Suspense>

              <Hydrated
                fallback={
                  <div className="inline-flex items-center justify-center h-9 px-1">
                    <Moon className="size-8" />
                  </div>
                }
              >
                <GuestThemeSwitch />
              </Hydrated>
            </div>
          </div>
        </div>
      </div>
      <div className="glass-edge"></div>
    </nav>
  );
}
