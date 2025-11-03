import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import * as marshal from "./marshal";

@Entity()
export class ComoBalance {
  constructor(props?: Partial<ComoBalance>) {
    Object.assign(this, props);
  }

  // for some reason subsquid tries to cast this to ::text, so uuid won't work
  @PrimaryColumn({
    type: "varchar",
    length: 36,
  })
  id!: string;

  @Index()
  @Column("numeric", { nullable: false })
  tokenId!: number;

  @Index()
  @Column("text", { nullable: false })
  owner!: string;

  @Index()
  @Column("numeric", {
    transformer: marshal.bigintTransformer,
    nullable: false,
  })
  amount!: bigint;
}
