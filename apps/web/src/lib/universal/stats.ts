export interface HourlyBreakdown {
  timestamp: string;
  count: number;
}

export interface ObjektStats {
  memberBreakdown: Record<string, HourlyBreakdown[]>;
  artistBreakdown: Record<string, HourlyBreakdown[]>;
  totalCount: number;
  premierCount: number;
  scannedCount: number;
}
