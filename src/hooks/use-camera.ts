import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const keys = {
  isSupported: ["camera-availability"],
  hasPermission: ["camera-permission"],
};

type Options = {
  enabled: boolean;
};

export function useCamera(opts?: Options) {
  const queryClient = useQueryClient();

  // check for camera support
  const isSupported = useQuery({
    queryKey: keys.isSupported,
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
    retry: false,
  });

  // get permission
  const hasPermission = useQuery({
    queryKey: keys.hasPermission,
    queryFn: async () => {
      try {
        await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        return true;
      } catch (err) {
        return false;
      }
    },
    staleTime: Infinity,
    retry: false,
    enabled: opts?.enabled ?? false,
  });

  // allow user to re-prompt for camera access
  const request = useMutation({
    mutationFn: async () => {
      await navigator.mediaDevices.getUserMedia({
        video: true,
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(keys.hasPermission, true);
      queryClient.setQueryData(keys.isSupported, true);
    },
  });

  return {
    isSupported: isSupported.data ?? false,
    hasPermission: hasPermission.data ?? false,
    isLoading: hasPermission.isPending || request.isPending,
    request: request.mutate,
  };
}
