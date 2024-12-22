import { LuRadical } from "react-icons/lu";

type Props = {
  error: string;
};

export default function CalculatingError({ error }: Props) {
  return (
    <div className="w-full flex flex-row gap-2 items-center justify-center mx-auto">
      <LuRadical className="size-6" />
      <span className="text-sm font-semibold">{error}</span>
    </div>
  );
}
