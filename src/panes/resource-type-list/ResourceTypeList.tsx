import { Flex, ScrollArea, Box, Text } from "@radix-ui/themes";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { useKubePathParams } from "../../util/kube/routes";
import { makeKubePath } from "../../util/kube/routes";
import { NoSelectStyle } from "../../util/platform";

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
export const ResourceTypeList = () => {
  const kubeParams = useKubePathParams();
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
    return n;
  }, [apiResources]);

  return (
    <ScrollArea
      scrollbars="vertical"
      style={{
        ...NoSelectStyle,
      }}
    >
      <Flex
        direction="column"
        style={{
          paddingLeft: "8px",
          paddingRight: "16px",
          fontSize: "13px",
        }}
        gap="4"
      >
        {filteredApiGroups.map((res) => (
          <Box key={res.name}>
            <Text
              style={{
                color: "var(--gray-11)",
              }}
            >
              {res.name}
            </Text>
            <Flex direction={"column"}>
              {res.resources.map((r) => {
                const route =
                  "/app" +
                  makeKubePath({
                    api_version: r.api_version,
                    group: res.name,
                    resource_plural: r.plural,
                  });
                return (
                  <Link
                    key={r.kind}
                    style={{
                      color: "black",
                      textDecoration: "unset",
                      backgroundColor:
                        kubeParams.resource_plural === r.plural &&
                        kubeParams.group === res.name
                          ? "var(--gray-3)"
                          : "transparent",
                      paddingLeft: "4px",
                      paddingTop: "2px",
                      paddingBottom: "2px",
                      borderRadius: "4px",
                      //borderLeft: "1px solid var(--accent-8)",
                    }}
                    to={route}
                  >
                    {r.kind}
                  </Link>
                );
              })}
            </Flex>
          </Box>
        ))}
      </Flex>
    </ScrollArea>
  );
};
