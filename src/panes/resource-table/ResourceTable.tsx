import {
  Box,
  Flex,
  Text,
  ScrollArea,
  TextField,
  Tooltip,
} from "@radix-ui/themes";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import { discoverRows } from "./layouts/autodiscovery";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { formatKubeAge } from "../../util/well-known-formatters";
import { useResourceList } from "../../util/kube/subscriptions";
import { useKubePathParams } from "../../util/kube/routes";
import { makeKubePath } from "../../util/kube/routes";
import { useKeyPress } from "../../util/keybinds";
import { NavLink } from "react-router";
import { Builtins } from "./layouts/builtins";

export const ResourceTable = () => {
  const kubeParams = useKubePathParams();
  return <ResourceTableInner kubeParams={kubeParams} />;
};
export const ResourceTableInner = ({
  kubeParams,
}: {
  kubeParams: ReturnType<typeof useKubePathParams>;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
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
  const { resources, lastEventTime } = useResourceList<any>(kubeParams);

  const [asyncColumns, setAsyncColumns] = useState<MRT_ColumnDef<any>[]>([]);

  useEffect(() => {
    (async () => {
      const discovered =
        resources.length > 0
          ? await discoverRows(kubeParams, resources[0])
          : [];
      setAsyncColumns(discovered);
    })();
  }, [resources]);
  const rows = useMemo(
    () => [...Builtins.Prepended, ...asyncColumns, ...Builtins.Appended],
    [asyncColumns]
  );

  const table = useMantineReactTable({
    columns: rows,
    data: resources,
    enableDensityToggle: false,
    initialState: {
      density: "xs",
    },
    enablePagination: false,
    enableTableFooter: false,
    enableColumnResizing: true,
    enableRowVirtualization: true,
    enableBottomToolbar: false,
  });
  useEffect(() => {
    if (resources.length > 0) {
      table.setColumnVisibility((d) => ({
        ...d,
        "metadata-namespace": !!resources[0].metadata.namespace,
      }));
    }
  }, [resources, table]);
  return (
    <Flex direction="column" flexGrow={"1"}>
      <Flex
        align="center"
        gap="4"
        data-tauri-drag-region
        style={{ paddingTop: "16px", paddingBottom: "16px" }}
      >
        <TextField.Root
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          // ref={ref}
          placeholder="Search..."
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
        <Box>
          <Tooltip
            content={`Last event: ${lastEventTime?.toString() ?? "unknown"}`}
          >
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
              {resources.length} {kubeParams.resource_plural}
            </Text>
          </Tooltip>
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
