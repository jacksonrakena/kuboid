import {
  Box,
  Flex,
  Text,
  ScrollArea,
  TextField,
  Tooltip,
  ContextMenu,
} from "@radix-ui/themes";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import { discoverRows } from "./layouts/autodiscovery";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useResourceList } from "../../util/kube/subscriptions";
import { useKubePathParams } from "../../util/kube/routes";
import { useKeyPress } from "../../util/keybinds";
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
        resources.length > 0 ? await discoverRows(kubeParams) : [];
      setAsyncColumns(discovered);
    })();
  }, [resources]);
  const rows = useMemo(
    () => [
      ...Builtins(kubeParams).Prepended,
      ...asyncColumns,
      ...Builtins(kubeParams).Appended,
    ],
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
    enableTopToolbar: false,

    mantineTableProps: {
      striped: true,
      style: {
        border: "none",
      },
    },
    mantinePaperProps: {
      withBorder: false,
    },
    enableFullScreenToggle: false,

    //enableHiding: false,
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
      <ResourceToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        lastEventTime={lastEventTime}
        kubeParams={kubeParams}
        resources={resources}
      />

      <ScrollArea>
        <MantineReactTable table={table} />
      </ScrollArea>
    </Flex>
  );
};

export const ResourceToolbar = ({
  searchTerm,
  setSearchTerm,
  lastEventTime,
  kubeParams,
  resources,
}: {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  lastEventTime: Date | null;
  kubeParams: ReturnType<typeof useKubePathParams>;
  resources: any[];
}) => {
  return (
    <Flex
      align="center"
      gap="4"
      data-tauri-drag-region
      style={{
        paddingTop: "16px",
        paddingBottom: "4px",
        paddingLeft: "16px",
      }}
    >
      <TextField.Root
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.currentTarget.value)}
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
  );
};

/*
      {/* <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Box>test</Box>
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
      */
