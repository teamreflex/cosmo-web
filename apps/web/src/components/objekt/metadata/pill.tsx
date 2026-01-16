type Props = {
  label: string;
  value: string;
};

export default function Pill({ label, value }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs sm:text-sm">
      <span className="font-semibold">{label}</span>
      <span>{value}</span>
    </div>
  );
}
