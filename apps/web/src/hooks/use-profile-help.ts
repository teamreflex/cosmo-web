import { createContext, useContext } from "react";

/**
 * Opens the help dialog of the profile tab on screen.
 */
export type ProfileHelp = {
  open: () => void;
};

export type ProfileHelpContextValue = {
  // undefined while the tab on screen has no help
  help: ProfileHelp | undefined;
  // a tab's help registers itself while it is mounted; returns the cleanup
  register: (help: ProfileHelp) => () => void;
};

export const ProfileHelpContext = createContext<ProfileHelpContextValue | null>(
  null,
);

/**
 * The profile header's actions menu reads the current tab's help from here,
 * and `ProfileHelp` registers it.
 */
export function useProfileHelp() {
  const ctx = useContext(ProfileHelpContext);
  if (!ctx) {
    throw new Error("useProfileHelp must be used within ProfileHelpProvider");
  }
  return ctx;
}
