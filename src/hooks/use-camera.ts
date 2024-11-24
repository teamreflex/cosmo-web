import { useQuery } from "@tanstack/react-query";

type Options = {
  enabled: boolean;
};

export function useCamera(opts?: Options) {
  const { data, isPending, refetch } = useQuery({
    queryKey: ["camera-availability"],
    queryFn: async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("getUserMedia is not supported in this browser");
        }

        await navigator.mediaDevices.getUserMedia({ video: true });
        return true;
      } catch (error) {
        return false;
      }
    },
    staleTime: Infinity,
    retry: false,
    enabled: opts?.enabled ?? false,
  });

  return {
    isAvailable: data ?? false,
    isLoading: isPending,
    request: refetch,
  };
}
