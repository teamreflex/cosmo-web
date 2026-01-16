import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
  OneToMany,
  ManyToOne,
} from "typeorm";
import { Collection } from "./collection.model";
import { Transfer } from "./transfer.model";

@Entity()
export class Objekt {
  constructor(props?: Partial<Objekt>) {
    Object.assign(this, props);
  }

  @PrimaryColumn()
  id!: string;

  @Index()
  @Column("text", { nullable: false })
  owner!: string;

  @Column("timestamp with time zone", { nullable: false })
  mintedAt!: Date;

  @Index()
  @Column("timestamp with time zone", { nullable: false })
  receivedAt!: Date;

  @Index()
  @Column("int4", { nullable: false })
  serial!: number;

  @Index()
  @Column("boolean", { nullable: false })
  transferable!: boolean;

  @OneToMany(() => Transfer, (e) => e.objekt)
  transfers!: Transfer[];

  @Index()
  @ManyToOne(() => Collection, { nullable: true })
  collection!: Collection;
}
