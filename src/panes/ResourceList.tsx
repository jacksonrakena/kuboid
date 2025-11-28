import { Flex, ScrollArea, Box, Link, Text } from "@radix-ui/themes";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useMemo } from "react";

type ApiResource = {
  kind: string;
  plural: string;
  group: string;
  version: string;
  api_version: string;
};
type ApiGroup = {
  name: string;
  version: string;
  resources: ApiResource[];
};
export const ResourceList = ({
  selectedResource,
  onSelectedResourceChanged,
}: {
  selectedResource: ApiResource;
  onSelectedResourceChanged: (changeTo: ApiResource) => void;
}) => {
  const [apiResources, setApiResources] = useState<ApiGroup[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const api = await invoke("list_api_resources");
        setApiResources(api as ApiGroup[]);
      } catch (e) {
        console.error("Failed to fetch API resources:", e);
      }
    })();
  }, []);

  const filteredApiGroups = useMemo(() => {
    const n = [...apiResources];
    n.sort((a, b) => {
      if (a.name.length === 0) return -1;
      return a.name.localeCompare(b.name);
    });
    return n.map((e) => {
      if (!e.name) {
        return {
          ...e,
          name: "Core",
        };
      }
      return e;
    });
  }, [apiResources]);

  return (
    <Box
      data-tauri-drag-region
      style={{
        borderRight: "1px solid var(--gray-3)",
        paddingTop: "32px",
      }}
    >
      <ScrollArea
        type="always"
        scrollbars="vertical"
        style={{ height: "100%" }}
      >
        {" "}
        <Flex
          direction="column"
          style={{
            marginRight: "32px",
            fontSize: "14px",
          }}
          gap="4"
        >
          {filteredApiGroups.map((res) => (
            <Box key={res.name}>
              <Text
                style={{
                  color: "var(--gray-11)",
                  fontSize: "13px",
                }}
              >
                {res.name}
              </Text>
              <Flex direction={"column"}>
                {res.resources.map((r) => (
                  <Link
                    href="#"
                    key={r.kind}
                    style={{
                      color: "black",
                      backgroundColor:
                        selectedResource.kind === r.kind &&
                        selectedResource.group ===
                          (res.name === "Core" ? "" : res.name)
                          ? "var(--blue-3)"
                          : "transparent",
                      paddingLeft: "4px",
                      borderRadius: "4px",
                    }}
                    onClick={() => {
                      onSelectedResourceChanged({
                        kind: r.kind,
                        group: res.name === "Core" ? "" : res.name,
                        version: res.version,
                        plural: r.plural,
                        api_version: r.api_version,
                      });
                    }}
                  >
                    {r.kind}
                  </Link>
                ))}
              </Flex>
            </Box>
          ))}
        </Flex>
      </ScrollArea>
    </Box>
  );
};
