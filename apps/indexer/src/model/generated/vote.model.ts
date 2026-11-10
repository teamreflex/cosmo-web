import { type Chain, chains } from "@apollo/util";
import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import * as marshal from "./marshal";

@Entity()
@Index("idx_vote_poll", ["chain", "tokenId", "pollId"])
@Index("idx_vote_revealed", ["chain", "tokenId", "pollId", "blockNumber"], {
  where: '"candidate_id" IS NOT NULL',
})
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

  // the chain poll_id, block_number and hash belong to
  @Column({
    type: "enum",
    enum: chains,
    enumName: "chain",
    default: "abstract",
    nullable: false,
  })
  chain!: Chain;

  @Index()
  @Column("text", { nullable: false })
  from!: string;

  @Index()
  @Column("timestamp with time zone", { nullable: false })
  createdAt!: Date;

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

  @Column("int4", { nullable: false })
  blockNumber!: number;

  @Column("int4", { nullable: false })
  logIndex!: number;

  @Column("text", { nullable: false })
  hash!: string;

  @Column("int4", { nullable: true })
  candidateId!: number | null;
}
