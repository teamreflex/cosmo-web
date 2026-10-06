import { Column, Entity, PrimaryColumn } from "typeorm";

// reference table synced by apps/schedules (sale listing stats per collection),
// read by apps/web's market. the processor never reads or writes it.
@Entity()
export class CollectionMarketStats {
  constructor(props?: Partial<CollectionMarketStats>) {
    Object.assign(this, props);
  }

  // joins to collection.slug
  @PrimaryColumn({
    type: "varchar",
    length: 255,
  })
  slug!: string;

  @Column("real", { nullable: false })
  floorUsd!: number;

  @Column("int4", { nullable: false })
  listingCount!: number;

  @Column("timestamp with time zone", { nullable: false })
  lastListedAt!: Date;
}
