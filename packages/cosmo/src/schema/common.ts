import { Schema } from "effect";
import { validArtists } from "../types/common";

export const ValidArtistSchema = Schema.Literals(validArtists);
