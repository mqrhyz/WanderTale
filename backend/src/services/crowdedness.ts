export function estimateCrowdedness(params: {
  placeTypes: string[];
  localDt: Date;
  weekend?: boolean;
}): {
  score: number;
  label: string;
  method: string;
  inputs: { place_types: string[]; hour: number; weekend: boolean };
} {
  const hour = params.localDt.getHours();
  const wknd =
    params.weekend !== undefined ? params.weekend : params.localDt.getDay() === 0 || params.localDt.getDay() === 6;

  const types = params.placeTypes;
  let base = 4;
  if (types.includes("tourist_attraction") || types.includes("amusement_park")) base = 7;
  else if (types.includes("restaurant") || types.includes("cafe")) base = 6;
  else if (types.includes("shopping_mall")) base = 7;
  else if (types.includes("museum")) base = 5;

  if (wknd && hour >= 10 && hour <= 18) base += 2;
  if (!wknd && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20))) base += 2;
  if (hour >= 12 && hour <= 14 && types.includes("restaurant")) base += 1;

  const score = Math.max(1, Math.min(10, base));
  let label = "low";
  if (score >= 8) label = "high";
  else if (score >= 5) label = "moderate";

  return {
    score,
    label,
    method: "heuristic_time_and_place_types",
    inputs: { place_types: types, hour, weekend: wknd },
  };
}
