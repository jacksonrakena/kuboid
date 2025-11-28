import { intervalToDuration } from "date-fns";

export const formatKubeAge = (creationTimestamp: string | Date) => {
  const significandShortUnits: {
    [k in keyof ReturnType<typeof intervalToDuration>]: string;
  } = {
    years: "y",
    months: "mo",
    days: "d",
    hours: "h",
    minutes: "m",
    seconds: "s",
    weeks: "w",
  };

  const creationDate =
    typeof creationTimestamp === "string"
      ? new Date(creationTimestamp)
      : creationTimestamp;

  const duration = intervalToDuration({
    start: creationDate,
    end: new Date(),
  });
  const significants = Object.entries(duration).filter(
    ([, value]) => value && value > 0
  );

  if (significants.length === 0) return "0s";

  const topTwoSignificants = significants.slice(0, 2);
  return topTwoSignificants
    .map(([unit, value]) => {
      return `${value}${
        significandShortUnits[unit as keyof typeof significandShortUnits]
      }`;
    })
    .join(" ");
};
