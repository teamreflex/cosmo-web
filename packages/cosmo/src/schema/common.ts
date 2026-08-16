import { Schema } from "effect";
import { validArtists } from "../types/common.js";

export const ValidArtistSchema = Schema.Literals(validArtists);
