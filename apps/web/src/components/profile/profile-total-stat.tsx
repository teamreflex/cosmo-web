type Props = {
  title: string;
  count: number;
};

export default function ProfileTotalStat({ title, count }: Props) {
  return (
    <>
      <span className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </span>
      <span className="font-mono text-[15px] font-semibold tabular-nums">
        {count.toLocaleString("en")}
      </span>
    </>
  );
}
