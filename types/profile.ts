export type UserProfile = {
  name: string;
  birth_date: string | null;   // ISO date string "YYYY-MM-DD"
  sex: string | null;
  height_cm: number | null;
  bodyweight_kg: number | null;
  training_goal: string | null;
  city: string | null;
};
