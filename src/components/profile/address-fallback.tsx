type Props = {
  username?: string;
};

export default function AddressFallback({ username = "User" }: Props) {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-semibold text-center">
        {username} does not have a COSMO address saved
      </p>
    </div>
  );
}
