export const SPECIAL_GRADIENT_CONIC =
  "conic-gradient(from 200deg at 50% 30%, #e6dbe2, #d3dde2, #efe5e3, #edd8e4, #bcadd2, #e6dbe2)";

export const SPECIAL_RIBBON_LINEAR =
  "linear-gradient(135deg, rgba(210, 225, 235, 0.6) 0%, transparent 40%), linear-gradient(225deg, rgba(235, 215, 225, 0.5) 0%, transparent 45%), linear-gradient(180deg, #ecd8dd 0%, #e3dce4 20%, #f1e5de 45%, #eedae4 70%, #c8b4d6 100%)";

export const IDNTT_UNIT_LINEAR =
  "linear-gradient(180deg, #ded7e0 0%, #e3e0e7 12%, #d8cee0 28%, #baa3c8 42%, #b098b9 55%, #d9aeb5 66%, #eec39b 76%, #f3d283 86%, #f0c558 100%)";

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

export function getVariantRibbon(variant: GradientVariant): string | null {
  if (variant.artist === "idntt" && variant.class === "Unit") {
    return IDNTT_UNIT_LINEAR;
  }
  if (variant.class === "Special") {
    return SPECIAL_RIBBON_LINEAR;
  }
  return null;
}
