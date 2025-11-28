import {
  Box,
  Flex,
  Table,
  Badge,
  Text,
  ScrollArea,
  Tooltip,
  TextField,
} from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { useKeyPress } from "./App";
import humanize from "@jsdevtools/humanize-anything";

import { RowType, discoverRows } from "./row-discovery";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { formatKubeAge } from "./well-known-formatters";
import { useResourceList } from "./subscriptions";

export const ResourceTable = ({
  resource,
}: {
  resource: {
    kind: string;
    group: string;
    plural: string;
    api_version: string;
    version: string;
  };
}) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useKeyPress("/", () => {
    ref.current?.focus();
  });
  useKeyPress(
    "Escape",
    () => {
      setSearchTerm("");
      ref.current?.blur();
    },
    { noEffectWhileInTextInput: false }
  );
  const [searchTerm, setSearchTerm] = useState("");
  const { resources, lastEventTime } = useResourceList<any>(resource);
  const [defaultRows, setDefaultRows] = useState<RowType[]>([]);
  useEffect(() => {
    (async () => {
      const discovered =
        resources.length > 0 ? await discoverRows(resource, resources[0]) : [];
      setDefaultRows([
        {
          name: "Name",
          render: (item: any) => (
            <Flex direction="column">
              {item.metadata?.name ?? "unknown"}
              {item.metadata?.namespace && (
                <Text color="gray">{item.metadata?.namespace}</Text>
              )}
            </Flex>
          ),
        },
        ...discovered,
        {
          name: "Age",
          render: (item: any) => {
            return formatKubeAge(item.metadata?.creationTimestamp);
          },
        },
      ]);
    })();
  }, [resources]);

  return (
    <Flex direction="column">
      <Flex align="center" gap="4">
        <TextField.Root
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          ref={ref}
          placeholder="mutex guard deez nuts"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
        <Box>
          <Text color="gray" size={"2"}>
            Last event: {lastEventTime?.toString() ?? "unknown"}
          </Text>
        </Box>
      </Flex>
      <ScrollArea style={{ width: "100%" }}>
        <Table.Root size="1">
          <Table.Header>
            <Table.Row>
              {defaultRows.map((row) => (
                <Tooltip content={row.help ?? "none"} key={row.name}>
                  <Table.ColumnHeaderCell>{row.name}</Table.ColumnHeaderCell>
                </Tooltip>
              ))}
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {resources
              .filter((r) => {
                if (searchTerm === "") return true;
                const term = searchTerm.toLowerCase();
                return (
                  r.metadata?.name?.toLowerCase().includes(term) ||
                  (r.metadata?.namespace &&
                    r.metadata?.namespace.toLowerCase().includes(term)) ||
                  r.status?.phase?.toLowerCase().includes(term) ||
                  humanize(r).toLowerCase().includes(term)
                );
              })
              .map((pod) => (
                <Table.Row key={pod.metadata?.name}>
                  {defaultRows.map((row) => (
                    <Table.Cell key={row.name}>
                      {"render" in row
                        ? row.render(pod)
                        : JSON.stringify(
                            row.path
                              .split(".")
                              .reduce(
                                (obj, key) => (obj ? obj[key] : "unknown"),
                                pod
                              )
                          )}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
          </Table.Body>
        </Table.Root>
      </ScrollArea>
    </Flex>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  let color: "red" | "green" | "yellow" | "gray" = "gray";
  if (status === "Running") color = "green";
  else if (status === "Pending") color = "yellow";
  else if (status === "Failed") color = "red";
  return <Badge color={color}>{status}</Badge>;
};
