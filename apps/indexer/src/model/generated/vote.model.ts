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
  @Column("int4", { nullable: false })
  tokenId!: number;

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
  @Column("int4", { nullable: false })
  blockNumber!: number;

  @Column("int4", { nullable: false })
  logIndex!: number;

  @Column("text", { nullable: false })
  hash!: string;

  @Column("int4", { nullable: true })
  candidateId!: number | null;
}
