import { m } from "@/i18n/messages";
import { Addresses, isEqual } from "@apollo/util";
import type { CollectionDataSource } from "@apollo/util";
import type { ReactNode } from "react";

export type Source = {
  title: string;
  subtitle: string;
  label: string;
  shortLabel: string;
  icon: ReactNode;
  value: CollectionDataSource;
  description: string;
  notes: string[];
  isAvailable: (address?: string) => boolean;
};

export function getSources(): Source[] {
  return [
    {
      title: m.data_source_blockchain_groups_title(),
      subtitle: m.data_source_blockchain_groups_subtitle(),
      label: m.data_source_blockchain_groups_label(),
      shortLabel: m.data_source_blockchain_groups_short(),
      icon: (
        <div className="relative size-6 rounded-full bg-abstract" data-icon>
          <img
            src="/abstract.svg"
            alt={m.data_source_blockchain_short()}
            className="absolute"
          />
        </div>
      ),
      value: "blockchain-groups",
      description: m.data_source_blockchain_groups_desc(),
      notes: [
        m.data_source_blockchain_groups_note_1(),
        m.data_source_blockchain_groups_note_2(),
        m.data_source_blockchain_groups_note_3(),
        m.data_source_blockchain_groups_note_4(),
        m.data_source_blockchain_groups_note_5(),
      ],
      /**
       * prevent collection groups being used on the spin account.
       * the SQL query to pull this off needs optimization.
       */
      isAvailable: (address) => {
        return address !== undefined ? !isEqual(address, Addresses.SPIN) : true;
      },
    },
    {
      title: m.data_source_blockchain_title(),
      subtitle: m.data_source_blockchain_subtitle(),
      label: m.data_source_blockchain_label(),
      shortLabel: m.data_source_blockchain_short(),
      icon: (
        <div className="relative size-6 rounded-full bg-abstract" data-icon>
          <img
            src="/abstract.svg"
            alt={m.data_source_blockchain_short()}
            className="absolute"
          />
        </div>
      ),
      value: "blockchain",
      description: m.data_source_blockchain_desc(),
      notes: [
        m.data_source_blockchain_note_1(),
        m.data_source_blockchain_note_2(),
      ],
      isAvailable: () => true,
    },
  ];
}
