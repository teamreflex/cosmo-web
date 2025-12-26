// Spotify API types
export type SpotifyAlbumImage = {
  url: string;
  height: number;
  width: number;
};

export type SpotifyArtist = {
  id: string;
  name: string;
};

export type SpotifyAlbum = {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  images: SpotifyAlbumImage[];
  release_date: string;
  total_tracks: number;
  external_urls: {
    spotify: string;
  };
};

export type SpotifySearchResponse = {
  albums: {
    items: SpotifyAlbum[];
    total: number;
    limit: number;
    offset: number;
  };
};
