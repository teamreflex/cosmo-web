"use client";

import { createContext, PropsWithChildren, useContext } from "react";
import { PublicUser } from "@/lib/universal/auth";

interface UserState {
  currentUser?: PublicUser;
}

const UserStateContext = createContext<UserState>({
  currentUser: undefined,
});

export function UserStateProvider({
  children,
  ...props
}: PropsWithChildren<UserState>) {
  return <UserStateContext value={props}>{children}</UserStateContext>;
}

export function useUserState() {
  const ctx = useContext(UserStateContext);
  if (!ctx) {
    throw new Error("useUserState must be used within a UserStateProvider");
  }

  return ctx;
}
