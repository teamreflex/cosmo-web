import { ProfileHelpContext } from "@/hooks/use-profile-help";
import type { ProfileHelp } from "@/hooks/use-profile-help";
import { useState } from "react";
import type { PropsWithChildren } from "react";

/**
 * Holds the help of the profile tab on screen, so the header's actions menu
 * can open it while the dialog itself lives in the tab.
 */
export function ProfileHelpProvider({ children }: PropsWithChildren) {
  const [help, setHelp] = useState<ProfileHelp>();

  function register(next: ProfileHelp) {
    setHelp(next);
    // a tab mounting in the same commit may have replaced it already
    return () => setHelp((current) => (current === next ? undefined : current));
  }

  return (
    <ProfileHelpContext value={{ help, register }}>
      {children}
    </ProfileHelpContext>
  );
}
