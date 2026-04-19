import { m } from "@/i18n/messages";
import { Addresses, isEqual } from "@apollo/util";
import type { CollectionDataSource } from "@apollo/util";
import type { ReactNode } from "react";

export type Source = {
  subtitle: string;
  label: string;
  shortLabel: string;
  icon: ReactNode;
  value: CollectionDataSource;
  isAvailable: (address?: string) => boolean;
};

export function getSources(): Source[] {
  return [
    {
      subtitle: m.data_source_blockchain_groups_subtitle(),
      label: m.data_source_blockchain_groups_label(),
      shortLabel: m.data_source_blockchain_groups_short(),
      icon: (
        <div className="relative size-6 rounded-full bg-abstract" data-icon>
          <img src="/abstract.svg" alt="Abstract" className="absolute" />
        </div>
      ),
      value: "blockchain-groups",
      /**
       * prevent collection groups being used on the spin account.
       * the SQL query to pull this off needs optimization.
       */
      isAvailable: (address) => {
        return address !== undefined ? !isEqual(address, Addresses.SPIN) : true;
      },
    },
    {
      subtitle: m.data_source_blockchain_subtitle(),
      label: m.data_source_blockchain_label(),
      shortLabel: m.data_source_blockchain_short(),
      icon: (
        <div className="relative size-6 rounded-full bg-abstract" data-icon>
          <img src="/abstract.svg" alt="Abstract" className="absolute" />
        </div>
      ),
      value: "blockchain",
      isAvailable: () => true,
    },
  ];
}
