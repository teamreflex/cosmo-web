import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { TransferParams } from "@/lib/universal/transfers";

type Props = {
  type: TransferParams["type"];
  setType: (type: TransferParams["type"]) => void;
};

export default function TransferTypeFilter({ type, setType }: Props) {
  return (
    <Select value={type} onValueChange={setType}>
      <SelectTrigger className="w-30">
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="mint">Mints</SelectItem>
        <SelectItem value="received">Received</SelectItem>
        <SelectItem value="sent">Sent</SelectItem>
        <SelectItem value="spin">Spin</SelectItem>
      </SelectContent>
    </Select>
  );
}
