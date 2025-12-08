import {
  Flex,
  HoverCard,
} from "@radix-ui/themes";
import { formatKubeAge } from "../util/well-known-formatters";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { useMemo } from "react";

export const TooltipKubeAge = ({
  creationTimestamp,
  spanProps,
}: {
  creationTimestamp: string;
  spanProps?: React.HTMLAttributes<HTMLSpanElement>;
}) => {
  const dateObj = useMemo(() => {
    if (!creationTimestamp) return null;
    const d = new Date(creationTimestamp);
    return isNaN(d.getTime()) ? null : d;
  }, [creationTimestamp]);

  const age = useMemo(
    () => dateObj ? formatKubeAge(dateObj.toISOString()) : "-",
    [dateObj]
  );
  const date = useMemo(
    () => dateObj ? format(dateObj, "eee, d MMM yyyy") : "-",
    [dateObj]
  );

  const localTime = useMemo(
    () => dateObj ? format(dateObj, "h:mm a") : "",
    [dateObj]
  );

  const localTimezone = useMemo(
    () => dateObj ? format(dateObj, "OOOO") : "",
    [dateObj]
  );

  const utcTime = useMemo(
    () => dateObj ? format(dateObj, "h:mm a", { in: tz("UTC") }) : "",
    [dateObj]
  );

  if (!dateObj) {
    return <span {...spanProps}>-</span>;
  }

  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <span {...spanProps}>{age}</span>
      </HoverCard.Trigger>
      <HoverCard.Content size="1" maxWidth="300px">
        <Flex gap="1" direction={"column"} style={{ fontSize: "12px" }}>
          <span>{date}</span>
          <span>
            {localTime} local ({localTimezone})
          </span>
          <span>{utcTime} UTC</span>
          <span></span>
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  );
};
