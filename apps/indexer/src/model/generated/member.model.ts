import { Entity, Column, PrimaryColumn, Index } from "typeorm";

// reference table synced by apps/schedules (canonical member sort order), read
// by apps/web. the processor never reads or writes it.
@Entity()
export class Member {
  constructor(props?: Partial<Member>) {
    Object.assign(this, props);
  }

  // for some reason subsquid tries to cast this to ::text, so uuid won't work
  @PrimaryColumn({
    type: "varchar",
    length: 36,
  })
  id!: string;

  // joins to collection.member
  @Index({ unique: true })
  @Column("text", { nullable: false })
  name!: string;

  @Column("int4", { nullable: false })
  cosmoId!: number;

  @Column("text", { nullable: false })
  artistId!: string;

  @Column("text", { nullable: false })
  alias!: string;

  @Column("jsonb", { nullable: false })
  units!: string[];

  @Column("text", { nullable: false })
  primaryColorHex!: string;

  @Column("int4", { nullable: false })
  sortOrder!: number;
}
