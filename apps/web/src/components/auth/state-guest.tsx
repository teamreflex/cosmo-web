import Hydrated from "@/components/hydrated";
import { Button } from "@/components/ui/button";
import { IconLanguage } from "@tabler/icons-react";
import ArtistSelectbox from "../navbar/artist-selectbox";
import GuestSettings from "../navbar/guest-settings";
import SignIn from "./sign-in";

export default function StateGuest() {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden md:contents">
        <Hydrated
          fallback={
            <Button variant="ghost" size="icon" disabled>
              <IconLanguage className="size-6" />
            </Button>
          }
        >
          <GuestSettings />
        </Hydrated>
      </div>

      <SignIn />

      <div className="hidden md:contents">
        <ArtistSelectbox />
      </div>
    </div>
  );
}
