import { Schema } from "effect";
import { validArtists } from "../types/common.ts";

export const ValidArtistSchema = Schema.Literals(validArtists);
