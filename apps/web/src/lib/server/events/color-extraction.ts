import { getAverageColor } from "fast-average-color-node";

/**
 * Extracts the dominant color from an image URL.
 * Returns a hex color string (e.g., "#FF5733") or null if extraction fails.
 */
export async function extractDominantColor(
  imageUrl: string | null,
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  try {
    const { hex } = await getAverageColor(imageUrl, { algorithm: "dominant" });
    return hex;
  } catch (error) {
    console.error("Failed to extract dominant color:", error);
    return null;
  }
}
