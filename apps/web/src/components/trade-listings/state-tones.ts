// badge colours for how a listing or a trade stands
export const tones = {
  ok: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  muted: "border-transparent bg-secondary text-muted-foreground",
  warn: "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
  bad: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
  cosmo:
    "border-transparent bg-cosmo/15 text-cosmo dark:bg-cosmo/30 dark:text-cosmo-text",
} as const;
