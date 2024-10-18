import { useState, useEffect } from "react";

export function useCamera() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        setIsLoading(true);

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.enumerateDevices
        ) {
          setIsLoading(false);
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(
          (device) => device.kind === "videoinput"
        );

        setIsAvailable(hasCamera);
      } catch (err) {
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCameraAvailability();
  }, []);

  return { isAvailable, isLoading };
}
