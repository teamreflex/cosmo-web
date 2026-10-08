import { Column, Entity, PrimaryColumn } from "typeorm";

// objekt and spun counts per collection, read by apps/web's mint-count sorts.
// maintained by triggers on objekt; the processor never reads or writes it.
@Entity()
export class CollectionStats {
  constructor(props?: Partial<CollectionStats>) {
    Object.assign(this, props);
  }

  // joins to objekt.collection_id and collection.id
  @PrimaryColumn({
    type: "varchar",
    length: 36,
  })
  collectionId!: string;

  @Column("int4", { nullable: false })
  objektCount!: number;

  @Column("int4", { nullable: false })
  spunCount!: number;
}
