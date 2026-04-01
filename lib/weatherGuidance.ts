export function getWeatherGuidance(temp: number, label: string): string | null {
  const isHot   = temp > 28;
  const isCool  = temp >= 5 && temp <= 15;
  const isCold  = temp < 5;
  const isWet   = ["Rain", "Drizzle", "Showers", "Stormy"].includes(label);
  const isSnow  = label === "Snow";
  const isClear = label === "Clear";

  if (isHot && isWet)    return "Hot and wet outside. A rest or indoor day makes sense today.";
  if (isHot)             return "Hot outside. Lighter effort or indoor training may feel better.";
  if (isCold && isSnow)  return "Snowing and cold. A good day to keep it indoors.";
  if (isCold && isWet)   return "Cold and wet. Indoor training is probably the call.";
  if (isCold)            return "Cold out. Keep it short outside, or bring it indoors.";
  if (isWet)             return "Rainy today. Indoor training or yoga might feel better.";
  if (isSnow)            return "Snowing out. Indoor training or a short easy effort outside.";
  if (isCool && isClear) return "Clear and cool. Great day to get outside.";
  if (isCool)            return "Cool and overcast. Good conditions for a run, walk, or outdoor session.";
  if (isClear)           return "Nice out. Good day for a run, walk, or light session.";
  return "Comfortable out. Any training works well today.";
}
