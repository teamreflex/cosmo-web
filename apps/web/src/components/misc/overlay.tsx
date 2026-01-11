type Props = {
  children: React.ReactNode;
};

export default function Overlay({ children }: Props) {
  return (
    <div className="fixed bottom-2 right-[calc(0.5rem+var(--removed-body-scroll-bar-size,0px))] flex flex-col gap-2">
      {children}
    </div>
  );
}
