import { createContext, useContext } from "react";

export const AuthenticatedContext = createContext(false);

export function useAuthenticated() {
  return useContext(AuthenticatedContext);
}
