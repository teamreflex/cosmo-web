module.exports = class Data1792036715473 {
  name = "Data1792036715473";

  // serial estimation (@apollo/serial-estimation) for objekts minted after
  // COSMO's v1 metadata cutoff.
  // serial_reservation: token-id ranges COSMO reserved for physical and QR
  // coupon objekts, bounded by the online mints on either side. the backfill
  // seeds it from history and the processor adds ranges as online mints jump.
  // serial_confirmation: real serials reported by users, entered by staff
  // through apps/web. the processor applies them but never writes the table.
  async up(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "serial_reservation" (
        "lo" integer NOT NULL,
        "hi" integer NOT NULL,
        CONSTRAINT "PK_serial_reservation" PRIMARY KEY ("lo")
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "serial_confirmation" (
        "token_id" varchar NOT NULL,
        "serial" integer NOT NULL,
        "confirmed_by" text,
        "confirmed_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_serial_confirmation" PRIMARY KEY ("token_id")
      );
    `);
  }

  async down(db) {
    await db.query(`DROP TABLE IF EXISTS "serial_confirmation";`);
    await db.query(`DROP TABLE IF EXISTS "serial_reservation";`);
  }
};
