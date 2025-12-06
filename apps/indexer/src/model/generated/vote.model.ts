import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import * as marshal from "./marshal";

@Entity()
export class Vote {
  constructor(props?: Partial<Vote>) {
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
  @Column("timestamp with time zone", { nullable: false })
  createdAt!: Date;

  @Index()
  @Column("text", { nullable: false })
  contract!: string;

  @Index()
  @Column("int4", { nullable: false })
  pollId!: number;

  @Index()
  @Column("numeric", {
    transformer: marshal.bigintTransformer,
    nullable: false,
  })
  amount!: bigint;

  @Index()
  @Column("int4", { nullable: true })
  blockNumber!: number;

  @Column("text", { nullable: true })
  hash!: string;
}
