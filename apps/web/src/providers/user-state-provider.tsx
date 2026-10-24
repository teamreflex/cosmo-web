import { type UserState, UserStateContext } from "@/hooks/use-user-state";
import type { PropsWithChildren } from "react";

type UserStateProviderProps = PropsWithChildren<UserState>;

export function UserStateProvider({
  children,
  ...props
}: UserStateProviderProps) {
  return (
    <UserStateContext.Provider value={props}>
      {children}
    </UserStateContext.Provider>
  );
}
