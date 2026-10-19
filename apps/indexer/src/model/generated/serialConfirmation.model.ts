import { Column, Entity, PrimaryColumn } from "typeorm";

// real serials reported by users, entered by staff through apps/web. the
// processor applies them to their collections but never writes this table.
@Entity()
export class SerialConfirmation {
  constructor(props?: Partial<SerialConfirmation>) {
    Object.assign(this, props);
  }

  // joins to objekt.id
  @PrimaryColumn("varchar")
  tokenId!: string;

  @Column("int4", { nullable: false })
  serial!: number;

  // web user id, null when seeded from COSMO's own data
  @Column("text", { nullable: true })
  confirmedBy!: string | null;

  @Column("timestamp with time zone", {
    nullable: false,
    default: () => "now()",
  })
  confirmedAt!: Date;
}
