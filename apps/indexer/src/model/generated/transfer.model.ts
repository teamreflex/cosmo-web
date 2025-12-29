import { Entity, Column, PrimaryColumn, Index, ManyToOne } from "typeorm";
import { Collection } from "./collection.model";
import { Objekt } from "./objekt.model";

@Entity()
export class Transfer {
  constructor(props?: Partial<Transfer>) {
    Object.assign(this, props);
  }

  // for some reason subsquid tries to cast this to ::text, so uuid won't work
  @PrimaryColumn({
    type: "varchar",
    length: 36,
  })
  id!: string;

  @Index()
  @Column("text", { nullable: false })
  from!: string;

  @Index()
  @Column("text", { nullable: false })
  to!: string;

  @Column("timestamp with time zone", { nullable: false })
  timestamp!: Date;

  @Column("text", { nullable: false })
  tokenId!: string;

  @Column("text", { nullable: false })
  hash!: string;

  @Index()
  @ManyToOne(() => Objekt, { nullable: true })
  objekt!: Objekt;

  @Index()
  @ManyToOne(() => Collection, { nullable: true })
  collection!: Collection;
}
