type Props = {
  children: React.ReactNode;
};

export default function Overlay({ children }: Props) {
  return (
    <div className="fixed right-[calc(0.5rem+var(--removed-body-scroll-bar-size,0px))] bottom-2 flex flex-col gap-2 z-40">
      {children}
    </div>
  );
}
