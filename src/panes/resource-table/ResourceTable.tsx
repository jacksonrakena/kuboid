import { Box, Flex, Table, Text, TextField, Tooltip } from "@radix-ui/themes";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import { discoverRows } from "./layouts/autodiscovery";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useResourceList } from "../../util/kube/subscriptions";
import { makeKubePath, useKubePathParams } from "../../util/kube/routes";
import { useKeyPress } from "../../util/keybinds";
import { Builtins } from "./layouts/builtins";
// import {
//   AllCommunityModule,
//   ModuleRegistry,
//   themeBalham,
// } from "ag-grid-community";

// // Register all Community features
// ModuleRegistry.registerModules([AllCommunityModule]);

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

  const [asyncColumns, setAsyncColumns] = useState<MRT_ColumnDef<any>[] | null>(
    null
  );

  useEffect(() => {
    setAsyncColumns(null);
  }, [kubeParams]);
  useEffect(() => {
    (async () => {
      if (resources.length > 0 && asyncColumns === null) {
        const discovered = await discoverRows(kubeParams);
        setAsyncColumns(discovered);
      }
    })();
  }, [resources, kubeParams]);
  const PREPEND_BLACKLIST = ["/api/v1/events"];
  const APPEND_BLACKLIST = ["/api/v1/events"];
  const rows = useMemo(
    () => [
      ...(PREPEND_BLACKLIST.includes(makeKubePath(kubeParams))
        ? []
        : Builtins(kubeParams).Prepended),
      ...(asyncColumns ?? []),
      ...(APPEND_BLACKLIST.includes(makeKubePath(kubeParams))
        ? []
        : Builtins(kubeParams).Appended),
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
    enableColumnActions: false,
    rowVirtualizerProps: {
      //overscan: 25,
      overscan: 5,
      estimateSize: () => 42,
    },

    mantineTableHeadRowProps: {
      style: {
        boxShadow: "none",
      },
    },
    mantinePaperProps: useMemo(
      () => ({
        withBorder: false,
        style: {
          height: "100%",
          display: "flex",
          flexDirection: "column",
        },
        shadow: undefined,
      }),
      []
    ),
    mantineTableContainerProps: useMemo(
      () => ({
        style: {
          flexGrow: 1,
          overflowY: "auto",
          overscrollBehavior: "none",
        },
      }),
      []
    ),
    enableFullScreenToggle: false,
  });

  return (
    <Flex direction="column" style={{ height: "100%" }}>
      <ResourceToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        lastEventTime={lastEventTime}
        kubeParams={kubeParams}
        resources={resources}
      />
      <Box flexGrow={"1"} style={{ minHeight: 0 }}>
        <MantineReactTable table={table} />
      </Box>
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
