import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { TransferType } from "@/lib/universal/transfers";
import { m } from "@/i18n/messages";

type Props = {
  type: TransferType;
  setType: (type: TransferType) => void;
};

export default function TransferTypeFilter({ type, setType }: Props) {
  return (
    <Select value={type} onValueChange={setType}>
      <SelectTrigger className="w-30">
        <SelectValue placeholder={m.common_type()} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{m.filter_type_all()}</SelectItem>
        <SelectItem value="mint">{m.filter_type_mints()}</SelectItem>
        <SelectItem value="received">{m.common_received()}</SelectItem>
        <SelectItem value="sent">{m.filter_type_sent()}</SelectItem>
        <SelectItem value="spin">{m.filter_type_spin()}</SelectItem>
      </SelectContent>
    </Select>
  );
}
