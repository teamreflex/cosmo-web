import { useQuery } from "@tanstack/react-query";

export function useCamera() {
  const { data, status } = useQuery({
    queryKey: ["camera-availability"],
    queryFn: async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return false;
      }

      return await navigator.mediaDevices
        .enumerateDevices()
        .then((devices) =>
          devices.some((device) => device.kind === "videoinput")
        );
    },
    staleTime: Infinity,
  });

  return {
    isAvailable: data ?? false,
    isLoading: status === "pending",
  };
}
