import { Column, Entity, PrimaryColumn } from "typeorm";

// floor, listing count and latest listing of each collection's priced sale
// listings, synced by apps/schedules and read by apps/web's market. a row
// exists only while the collection is listed; the processor never reads or
// writes it.
@Entity()
export class CollectionMarketStats {
  constructor(props?: Partial<CollectionMarketStats>) {
    Object.assign(this, props);
  }

  // joins to collection.id
  @PrimaryColumn({
    type: "varchar",
    length: 36,
  })
  collectionId!: string;

  @Column("real", { nullable: false })
  floorUsd!: number;

  @Column("int4", { nullable: false })
  listingCount!: number;

  @Column("timestamp with time zone", { nullable: false })
  lastListedAt!: Date;
}
