import { IDBPDatabase, openDB } from "idb";
import { OMASchema } from "./schema";
import {
  CosmoAlbumTrackDownload,
  CosmoAlbumWithTracks,
} from "@/lib/universal/cosmo/albums";
import { ofetch } from "ofetch";

export class OMAStorageService {
  private dbName = "oma-storage";
  private dbVersion = 1;
  private db: IDBPDatabase<OMASchema> | null = null;

  /**
   * Initialize the database.
   */
  async initialize(): Promise<void> {
    this.db = await openDB<OMASchema>(this.dbName, this.dbVersion, {
      upgrade(db) {
        // init albums store
        const albums = db.createObjectStore("albums", {
          keyPath: "hid",
        });
        albums.createIndex("by-hid", "hid");

        // init tracks store
        const tracks = db.createObjectStore("tracks", {
          keyPath: "track.hid",
        });
        tracks.createIndex("by-album", "track.albumHid");
      },
    });
  }

  /**
   * Download the MP3 blob from COSMO and store it in the database.
   */
  async downloadTrack(download: CosmoAlbumTrackDownload): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const response = await ofetch.raw<Blob>(download.fileAccessUrl, {
        retry: 2,
      });

      if (response.ok === false) {
        throw new Error(`Failed to download track ${download.title}`);
      }

      const data = await response.blob();

      // exclude access URL from storage
      const { fileAccessUrl, ...track } = download;

      await this.db.put("tracks", {
        track,
        data,
      });
    } catch (error) {
      console.error(`Failed to store track ${download.title}:`, error);
      throw error;
    }
  }

  /**
   * Pull an MP3 blob from the database for the given track HID.
   */
  async getTrackData(trackHid: string): Promise<Blob | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const result = await this.db.get("tracks", trackHid);
    return result?.data || null;
  }

  /**
   * Store an album.
   */
  async storeAlbum(album: CosmoAlbumWithTracks) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    await this.db.put("albums", album);
  }

  /**
   * Get all currently registered albums.
   */
  async getAlbums(): Promise<CosmoAlbumWithTracks[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return await this.db.getAll("albums");
  }

  /**
   * Get a single album.
   */
  async getAlbum(albumHid: string): Promise<CosmoAlbumWithTracks | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const result = await this.db.get("albums", albumHid);
    return result || null;
  }
}
