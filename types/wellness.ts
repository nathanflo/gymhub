export interface WellnessEntry {
  id: string;
  date: string;          // YYYY-MM-DD (one per calendar date)
  sleep?: number;        // hours, e.g. 7.5
  hydration?: number;    // litres, e.g. 2.5
  caffeine?: number;     // cups, e.g. 2
  mood?: 1 | 2 | 3 | 4 | 5;
  soreness?: 1 | 2 | 3 | 4 | 5;  // 1 = fresh, 5 = very sore
  notes?: string;
}
