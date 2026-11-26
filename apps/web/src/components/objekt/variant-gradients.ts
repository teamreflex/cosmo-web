export const SPECIAL_GRADIENT_CONIC =
  "conic-gradient(from 200deg at 50% 30%, #e6dbe2, #d3dde2, #efe5e3, #edd8e4, #bcadd2, #e6dbe2)";

export const SPECIAL_RIBBON_LINEAR =
  "linear-gradient(135deg, rgba(210, 225, 235, 0.6) 0%, transparent 40%), linear-gradient(225deg, rgba(235, 215, 225, 0.5) 0%, transparent 45%), linear-gradient(180deg, #ecd8dd 0%, #e3dce4 20%, #f1e5de 45%, #eedae4 70%, #c8b4d6 100%)";

export const IDNTT_UNIT_LINEAR =
  "linear-gradient(180deg, #ded7e0 0%, #e3e0e7 12%, #d8cee0 28%, #baa3c8 42%, #b098b9 55%, #d9aeb5 66%, #eec39b 76%, #f3d283 86%, #f0c558 100%)";

/**
 * The holographic finish every Special class back shares, fitted as a stack of
 * radial gradients to the median of 17 back images with their text masked out.
 * Positions and sizes are fractions of the back's coloured panel.
 */
export const SPECIAL_BACK_HOLO = [
  "radial-gradient(6% 4.6% at 55.7% 56.1%, rgb(220 189 183 / 0.36) 44.1%, rgb(220 189 183 / 0))",
  "radial-gradient(15% 15.1% at 74.4% 52.3%, rgb(204 194 246 / 0.31) 44.1%, rgb(204 194 246 / 0))",
  "radial-gradient(17% 9.9% at 75.2% 40.3%, rgb(157 168 255 / 0.2) 45.9%, rgb(157 168 255 / 0))",
  "radial-gradient(19% 12.1% at 27.7% 82.4%, rgb(226 218 222 / 0.78) 33.7%, rgb(226 218 222 / 0))",
  "radial-gradient(29.5% 13.3% at 101.8% 28.2%, rgb(202 149 255 / 0.33) 27.2%, rgb(202 149 255 / 0))",
  "radial-gradient(16.5% 8.7% at 39.1% 6.5%, rgb(255 227 216 / 0.62) 49.7%, rgb(255 227 216 / 0))",
  "radial-gradient(21.5% 19.6% at 35.2% 49%, rgb(237 240 214 / 0.51) 46.9%, rgb(237 240 214 / 0))",
  "radial-gradient(19% 13.3% at 67.1% -2.8%, rgb(226 255 224 / 0.58) 30.3%, rgb(226 255 224 / 0))",
  "radial-gradient(47% 6.9% at 90.5% 79.9%, rgb(177 189 209 / 0.48) 3.8%, rgb(177 189 209 / 0))",
  "radial-gradient(28.5% 16.3% at 13.4% 47%, rgb(217 217 255 / 0.48) 43.1%, rgb(217 217 255 / 0))",
  "radial-gradient(19.5% 6.1% at 34.9% 87.6%, rgb(255 181 206 / 0.89) 21.6%, rgb(255 181 206 / 0))",
  "radial-gradient(34% 17.4% at 4.2% 98%, rgb(222 236 223 / 1) 12.5%, rgb(222 236 223 / 0))",
  "radial-gradient(23% 16.6% at 93.9% 16.5%, rgb(255 192 213 / 0.75) 30.3%, rgb(255 192 213 / 0))",
  "radial-gradient(13.5% 11% at 39% 25.9%, rgb(169 239 255 / 0.44) 15.3%, rgb(169 239 255 / 0))",
  "radial-gradient(22% 15.9% at 3.1% 39.6%, rgb(255 126 97 / 0.35) 0%, rgb(255 126 97 / 0))",
  "radial-gradient(16.5% 13.3% at 46.6% 33.5%, rgb(255 235 187 / 0.56) 46.2%, rgb(255 235 187 / 0))",
  "radial-gradient(42.5% 23.8% at 34.2% 76%, rgb(248 220 219 / 0.54) 55.6%, rgb(248 220 219 / 0))",
  "radial-gradient(22.5% 19.6% at 57.5% 11.8%, rgb(181 201 246 / 0.54) 47.2%, rgb(181 201 246 / 0))",
  "radial-gradient(34.5% 46.3% at 60.8% 56.2%, rgb(255 138 255 / 0.36) 21.9%, rgb(255 138 255 / 0))",
  "radial-gradient(52% 17.8% at 52.3% 26.3%, rgb(255 57 100 / 0.26) 15%, rgb(255 57 100 / 0))",
  "radial-gradient(18.5% 14% at 24.6% 37.6%, rgb(122 236 255 / 0.61) 12.2%, rgb(122 236 255 / 0))",
  "radial-gradient(83% 22.3% at 44.4% 93.1%, rgb(89 0 204 / 0.22) 0.9%, rgb(89 0 204 / 0))",
  "radial-gradient(54.5% 74.8% at 4.9% 29.7%, rgb(252 251 237 / 0.89) 56.6%, rgb(252 251 237 / 0))",
  "radial-gradient(55% 118.1% at 99.1% 111.5%, rgb(144 215 240 / 0.84) 56.6%, rgb(144 215 240 / 0))",
  "rgb(214 210 229)",
].join(", ");

type GradientVariant = { class: string; artist: string };

export function getVariantGradient(variant: GradientVariant): string | null {
  if (variant.artist === "idntt" && variant.class === "Unit") {
    return IDNTT_UNIT_LINEAR;
  }
  if (variant.class === "Special") {
    return SPECIAL_GRADIENT_CONIC;
  }
  return null;
}

export function getVariantBack(variant: GradientVariant): string | null {
  if (variant.artist === "idntt" && variant.class === "Unit") {
    return IDNTT_UNIT_LINEAR;
  }
  if (variant.class === "Special") {
    return SPECIAL_BACK_HOLO;
  }
  return null;
}

export function getVariantRibbon(variant: GradientVariant): string | null {
  if (variant.artist === "idntt" && variant.class === "Unit") {
    return IDNTT_UNIT_LINEAR;
  }
  if (variant.class === "Special") {
    return SPECIAL_RIBBON_LINEAR;
  }
  return null;
}
