import {
  Box,
  Flex,
  Table,
  Badge,
  Text,
  ScrollArea,
  Tooltip,
  TextField,
  Code,
  ContextMenu,
} from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { useKeyPress } from "./App";
import humanize from "@jsdevtools/humanize-anything";

import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_GlobalFilterTextInput,
  MRT_ToggleFiltersButton,
} from "mantine-react-table";
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
  console.log(resources);
  const [defaultRows, setDefaultRows] = useState<MRT_ColumnDef<any>[]>([
    {
      id: "metadata-name",
      header: "Name",
      accessorFn: (row) => row.metadata?.name,
      Cell: ({ renderedCellValue, row }) => (
        <Flex direction="column">
          {/* <Box>
              <Code>{item.metadata?.name ?? "unknown"}</Code>
            </Box>

            {item.metadata?.namespace && (
              <Text>{item.metadata?.namespace}</Text>
            )} */}
          {renderedCellValue}
        </Flex>
      ),
    },
    {
      id: "metadata-age",
      header: "Age",
      accessorFn: (row) => new Date(row.metadata?.creationTimestamp),
      filterVariant: "date-range",
      Cell: ({ renderedCellValue }) => <>{formatKubeAge(renderedCellValue)}</>,
    },
  ]);
  useEffect(() => {
    (async () => {
      const discovered =
        resources.length > 0 ? await discoverRows(resource, resources[0]) : [];
      setDefaultRows([
        {
          id: "metadata-name",
          header: "Name",
          accessorFn: (row) => row.metadata?.name,
          Cell: ({ renderedCellValue, row }) => (
            <Flex direction="column">
              {/* <Box>
              <Code>{item.metadata?.name ?? "unknown"}</Code>
            </Box>

            {item.metadata?.namespace && (
              <Text>{item.metadata?.namespace}</Text>
            )} */}
              {renderedCellValue}
            </Flex>
          ),
        },
        ...discovered,
        {
          id: "metadata-age",
          header: "Age",
          accessorFn: (row) => new Date(row.metadata?.creationTimestamp),
          filterVariant: "date-range",
          Cell: ({ renderedCellValue }) => (
            <>{formatKubeAge(renderedCellValue)}</>
          ),
        },
      ]);
    })();
  }, [resources]);

  const table = useMantineReactTable({
    columns: defaultRows,
    data: resources,
    enableDensityToggle: false,
    initialState: {
      density: "xs",
    },
  });
  return (
    <Flex direction="column" flexGrow={"1"}>
      <Flex align="center" gap="4" data-tauri-drag-region>
        <TextField.Root
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          ref={ref}
          placeholder="Search..."
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
        <Box>
          <Text
            color="gray"
            size={"2"}
            unselectable="on"
            data-tauri-drag-region
            style={{
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
          >
            Last event: {lastEventTime?.toString() ?? "unknown"}
          </Text>
        </Box>
      </Flex>
      <ScrollArea>
        <MantineReactTable table={table} />
        {/* <Table.Root size="1">
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
                <ContextMenu.Root>
                  <ContextMenu.Trigger>
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
                  </ContextMenu.Trigger>
                  <ContextMenu.Content>
                    <ContextMenu.Item>Describe</ContextMenu.Item>
                    <ContextMenu.Item>Edit</ContextMenu.Item>
                    <ContextMenu.Item>Show</ContextMenu.Item>
                    <ContextMenu.Sub>
                      <ContextMenu.SubTrigger>Jump to</ContextMenu.SubTrigger>
                      <ContextMenu.SubContent>
                        <ContextMenu.Item>Owner (StatefulSet)</ContextMenu.Item>
                        <ContextMenu.Item>Node</ContextMenu.Item>
                      </ContextMenu.SubContent>
                    </ContextMenu.Sub>
                    <ContextMenu.Separator />
                    <ContextMenu.Item>Logs</ContextMenu.Item>
                    <ContextMenu.Item>Attach</ContextMenu.Item>
                    <ContextMenu.Item>Shell</ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item>Port forward</ContextMenu.Item>
                    <ContextMenu.Item>Copy files</ContextMenu.Item>
                    <ContextMenu.Separator />

                    <ContextMenu.Item color="red">Delete</ContextMenu.Item>
                  </ContextMenu.Content>
                </ContextMenu.Root>
              ))}
          </Table.Body>
        </Table.Root> */}
      </ScrollArea>
    </Flex>
  );
};
