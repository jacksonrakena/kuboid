import { Box, Button, DropdownMenu, Flex, Spinner, Text, TextField, Tooltip } from "@radix-ui/themes";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table";
import { discoverRows } from "./layouts/autodiscovery";
import { MagnifyingGlassIcon, MixIcon } from "@radix-ui/react-icons";
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
  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([]);

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

  // Merge namespaces into params for backend subscription
  const effectiveParams = useMemo(() => ({
    ...kubeParams,
    namespaces: selectedNamespaces
  }), [kubeParams, selectedNamespaces]);

  const { resources, lastEventTime, isLoading } = useResourceList<any>(effectiveParams);

  // Client-side search implementation
  const filteredResources = useMemo(() => {
    if (!searchTerm) return resources;
    const lowerTerm = searchTerm.toLowerCase();
    return resources.filter(r => {
      // Simple search on name and namespace
      const name = r.metadata?.name?.toLowerCase() ?? "";
      const ns = r.metadata?.namespace?.toLowerCase() ?? "";
      return name.includes(lowerTerm) || ns.includes(lowerTerm);
    });
  }, [resources, searchTerm]);

  const [asyncColumns, setAsyncColumns] = useState<MRT_ColumnDef<any>[] | null>(
    null
  );

  useEffect(() => {
    setAsyncColumns(null);
  }, [kubeParams]);
  useEffect(() => {
    (async () => {
      if (filteredResources.length > 0 && asyncColumns === null) {
        const discovered = await discoverRows(kubeParams);
        setAsyncColumns(discovered);
      }
    })();
  }, [filteredResources, kubeParams]);
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
    data: filteredResources,
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
        resources={filteredResources}
        selectedNamespaces={selectedNamespaces}
        setSelectedNamespaces={setSelectedNamespaces}
        isLoading={isLoading}
      />
      <Box flexGrow={"1"} style={{ minHeight: 0 }}>
        {(isLoading && resources.length === 0) ? (
          <Flex align="center" justify="center" style={{ height: "100%" }}>
            <Spinner size="3" />
          </Flex>
        ) : (
          <MantineReactTable table={table} />
        )}
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
  selectedNamespaces,
  setSelectedNamespaces,
  isLoading
}: {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  lastEventTime: Date | null;
  kubeParams: ReturnType<typeof useKubePathParams>;
  resources: any[];
  selectedNamespaces: string[];
  setSelectedNamespaces: React.Dispatch<React.SetStateAction<string[]>>;
  isLoading: boolean;
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

      {kubeParams.resource_plural !== "namespaces" && (
        <NamespaceSelector selected={selectedNamespaces} onChange={setSelectedNamespaces} />
      )}

      <Box>
        <Tooltip
          content={`Last event: ${lastEventTime?.toString() ?? "unknown"}`}
        >
          <Flex align="center" gap="2" style={{ cursor: "default" }}>
            <Box
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: isLoading ? "var(--yellow-10)" : "var(--green-10)",
              }}
            />
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
          </Flex>
        </Tooltip>
      </Box>
    </Flex>
  );
};

const NamespaceSelector = ({ selected, onChange }: { selected: string[], onChange: (ns: string[]) => void }) => {
  // Fetch namespaces list
  const { resources: namespaces } = useResourceList<any>({
    group: "",
    api_version: "v1",
    resource_plural: "namespaces",
  });

  // Sort namespaces: default first, then alphabetical
  const sortedNamespaces = useMemo(() => {
    return [...namespaces].sort((a, b) => {
      const nameA = a.metadata.name;
      const nameB = b.metadata.name;
      if (nameA === 'default') return -1;
      if (nameB === 'default') return 1;
      return nameA.localeCompare(nameB);
    });
  }, [namespaces]);

  const toggleNamespace = (ns: string) => {
    if (selected.includes(ns)) {
      onChange(selected.filter(s => s !== ns));
    } else {
      onChange([...selected, ns]);
    }
  };

  const clearSelection = () => onChange([]);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="soft" color="gray" size="1">
          <MixIcon />
          {selected.length === 0 ? "All Namespaces" : `${selected.length} Selected`}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={clearSelection}>
          All Namespaces
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <Box style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {sortedNamespaces.map(ns => {
            const name = ns.metadata.name;
            return (
              <DropdownMenu.CheckboxItem
                key={name}
                checked={selected.includes(name)}
                onCheckedChange={() => toggleNamespace(name)}
              >
                {name}
              </DropdownMenu.CheckboxItem>
            )
          })}
        </Box>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

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
