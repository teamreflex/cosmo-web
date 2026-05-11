import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity()
@Index(["hash", "tokenId"], { unique: true })
export class TransferBacklog {
  constructor(props?: Partial<TransferBacklog>) {
    Object.assign(this, props);
  }

  // matches Transfer.id — varchar(36) rather than uuid to avoid subsquid casting issues
  @PrimaryColumn({
    type: "varchar",
    length: 36,
  })
  id!: string;

  @Column("text", { nullable: false })
  hash!: string;

  @Column("text", { nullable: false })
  from!: string;

  @Column("text", { nullable: false })
  to!: string;

  @Index()
  @Column("text", { nullable: false })
  tokenId!: string;

  @Column("timestamp with time zone", { nullable: false })
  timestamp!: Date;

  @Column("integer", { nullable: false })
  retryCount!: number;

  @Index()
  @Column("timestamp with time zone", { nullable: true })
  lastAttemptAt!: Date | null;

  @Column("timestamp with time zone", {
    nullable: false,
    default: () => "now()",
  })
  createdAt!: Date;
}
