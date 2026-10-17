export type AdminSerialConfirmation = {
  tokenId: string;
  confirmedSerial: number;
  confirmedAt: Date;
  /**
   * The objekt's stored serial and collection, null when the token hasn't been indexed.
   */
  objekt: {
    serial: number;
    slug: string;
  } | null;
  /**
   * Null for rows seeded by hand. The username is null when the web user no longer exists.
   */
  confirmedBy: {
    id: string;
    username: string | null;
  } | null;
};
