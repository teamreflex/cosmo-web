type Props = {
  children: React.ReactNode;
};

export default function Overlay({ children }: Props) {
  return (
    <div className="fixed right-2 bottom-2 z-40 flex flex-col gap-2">
      {children}
    </div>
  );
}
