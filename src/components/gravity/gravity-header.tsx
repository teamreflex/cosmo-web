import { CosmoGravity } from "@/lib/universal/cosmo/gravity";
import GravityEventType from "./gravity-event-type";
import GravityTimestamp from "./gravity-timestamp";

type Props = {
  gravity: CosmoGravity;
};

export default function GravityHeader({ gravity }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">{gravity.title}</h2>
      <div className="flex gap-2 items-center">
        <GravityEventType type={gravity.type} />
        <span>·</span>
        <GravityTimestamp
          start={gravity.entireStartDate}
          end={gravity.entireEndDate}
        />
      </div>
    </div>
  );
}
