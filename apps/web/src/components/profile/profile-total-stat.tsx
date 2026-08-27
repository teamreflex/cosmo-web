type Props = {
  title: string;
  count: number;
};

export default function ProfileTotalStat({ title, count }: Props) {
  return (
    <>
      <span className="text-xs text-muted-foreground">{title}</span>
      <span className="font-mono text-[15px] font-semibold tabular-nums">
        {count.toLocaleString("en")}
      </span>
    </>
  );
}
