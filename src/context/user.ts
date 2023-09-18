import { TokenPayload } from "@/lib/server/jwt";
import { createContext } from "react";

export const UserContext = createContext<TokenPayload | undefined>(undefined);
