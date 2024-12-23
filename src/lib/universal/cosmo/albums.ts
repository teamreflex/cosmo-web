import { CosmoArtistBFF } from "./artists";

export type CosmoAlbum = {
  artist: CosmoArtistBFF;
  title: string;
  albumImageThumbnailUrl: string;
  omaImageThumbnailUrl: string;
  hid: string;
  releasedAt: string;
};

export type CosmoAlbumClaimError = {
  statusCode: number;
  message: string;
};

export interface CosmoAlbumWithTracks extends CosmoAlbum {
  artist: CosmoArtistBFF;
  title: string;
  albumImageThumbnailUrl: string;
  omaImageThumbnailUrl: string;
  hid: string;
  releasedAt: string;
  albumTracks: CosmoAlbumTrack[];
}

export type CosmoAlbumTrack = {
  title: string;
  hid: string;
  albumHid: string;
  trackNo: number;
  duration: number;
};

export interface CosmoAlbumTrackDownload extends CosmoAlbumTrack {
  fileAccessUrl: string;
}

const patterns = [
  // objekt QR code
  {
    type: "objekt",
    pattern: /[?&]n=([^&]+)/,
    extract: (match: RegExpMatchArray) => match[1],
  },
  // OMA QR code
  {
    type: "oma",
    pattern: /^[a-f0-9]{32}$/,
    extract: (match: RegExpMatchArray) => match[0],
  },
] as const;

type ObjektCode = {
  type: "objekt";
  value: string;
};

type OMACode = {
  type: "oma";
  value: string;
};

type MatchedCode = ObjektCode | OMACode;

export function extractObjektCode(input: string): MatchedCode {
  for (const { type, pattern, extract } of patterns) {
    const match = input.match(pattern);
    if (match) {
      return {
        type,
        value: extract(match),
      };
    }
  }
  throw new InvalidQRCodeError();
}

export class InvalidQRCodeError extends Error {
  constructor() {
    super("Invalid QR code");
  }
}
