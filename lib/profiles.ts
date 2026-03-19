import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types/profile";

export async function getProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("name, birth_date, sex, height_cm, bodyweight_kg, training_goal, city")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    name: data.name ?? "",
    birth_date: data.birth_date ?? null,
    sex: data.sex ?? null,
    height_cm: data.height_cm ?? null,
    bodyweight_kg: data.bodyweight_kg ?? null,
    training_goal: data.training_goal ?? null,
    city: data.city ?? null,
  };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").upsert({
    id: user.id,
    name: profile.name || null,
    birth_date: profile.birth_date,
    sex: profile.sex,
    height_cm: profile.height_cm,
    bodyweight_kg: profile.bodyweight_kg,
    training_goal: profile.training_goal,
    city: profile.city,
  });
}
