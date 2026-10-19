import { Column, Entity, PrimaryColumn } from "typeorm";

// token-id ranges COSMO reserved for physical and QR coupon objekts, bounded
// by the online mints on either side. read and written by the processor's
// serial numbering through raw SQL.
@Entity()
export class SerialReservation {
  constructor(props?: Partial<SerialReservation>) {
    Object.assign(this, props);
  }

  // the online token id just below the reserved range
  @PrimaryColumn("int4")
  lo!: number;

  // the online token id just above it
  @Column("int4", { nullable: false })
  hi!: number;
}
