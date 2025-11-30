import { Flex, ScrollArea, Box, Text, TextField } from "@radix-ui/themes";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useMemo } from "react";
import { Link, useMatch } from "react-router";
import { useKubePathParams } from "../../util/kube/routes";
import { makeKubePath } from "../../util/kube/routes";
import { NoSelectStyle } from "../../util/platform";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

import uFuzzy from "@leeoniya/ufuzzy";
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
const ufuzzy = new uFuzzy();

export const executeSearch = (groups: ApiGroup[], query: string) => {
  const flatList: { group: ApiGroup; resource: ApiResource }[] = [];
  for (const g of groups) {
    for (const r of g.resources) {
      flatList.push({ group: g, resource: r });
    }
  }
  const haystack = flatList.map((r) => r.resource.kind);
  const filter = ufuzzy.filter(haystack, query);
  if (!filter) return null;
  const info = ufuzzy.info(filter, haystack, query);
  const order = ufuzzy.sort(info, haystack, query);

  return order.map((e) => {
    const index = info.idx[e];
    const resource = flatList[index];
    return { resource, info: info.ranges[e] as [number, number] | undefined };
  });
};
export const ResourceTypeList = () => {
  const kubeParams = useKubePathParams();
  const isHome = useMatch("/app");
  const [search, setSearch] = useState("");
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

  type SearchGroup = Omit<ApiGroup, "resources"> & {
    resources: (ApiResource & { ranges?: [number, number] })[];
  };
  const searchedResources = useMemo(() => {
    if (search.trim() === "") return filteredApiGroups;
    const results = executeSearch(filteredApiGroups, search);
    if (!results) return [];

    return results.reduce<SearchGroup[]>((acc, curr) => {
      let group = acc.find((g) => g.name === curr.resource.group.name);
      if (!group) {
        group = {
          name: curr.resource.group.name,
          version: curr.resource.group.version,
          resources: [],
        };
        acc.push(group);
      }
      group.resources.push({ ...curr.resource.resource, ranges: curr.info });
      return acc;
    }, []);
  }, [search, filteredApiGroups]) as SearchGroup[];

  return (
    <>
      <Box style={{ paddingLeft: "16px", paddingRight: "16px" }}>
        <TextField.Root
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          size={"2"}
          placeholder="Search resource types..."
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
      </Box>
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
          <Link
            style={{
              color: "black",
              textDecoration: "unset",
              backgroundColor: !!isHome ? "var(--gray-3)" : "transparent",
              paddingLeft: "4px",
              paddingTop: "2px",
              paddingBottom: "2px",
              borderRadius: "4px",
              //borderLeft: "1px solid var(--accent-8)",
            }}
            to={"/app"}
          >
            Overview
          </Link>
          {searchedResources.map((res) => (
            <Box key={res.name === "" ? "Core" : res.name}>
              <Text
                style={{
                  color: "var(--gray-11)",
                }}
              >
                {res.name === "" ? "Core" : res.name}
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
                          kubeParams.api_version === r.api_version &&
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
                      {r.ranges ? (
                        <BoldTextRange
                          fullText={r.kind}
                          startIndex={r.ranges[0]}
                          endIndex={r.ranges[1]}
                        />
                      ) : (
                        <>{r.kind}</>
                      )}
                    </Link>
                  );
                })}
              </Flex>
            </Box>
          ))}
        </Flex>
      </ScrollArea>
    </>
  );
};
export const BoldTextRange = ({
  fullText,
  startIndex,
  endIndex,
}: {
  fullText: string;
  startIndex: number;
  endIndex: number;
}) => {
  const beforeBold = fullText.substring(0, startIndex);
  const boldPart = fullText.substring(startIndex, endIndex);
  const afterBold = fullText.substring(endIndex);

  return (
    <span>
      {beforeBold}
      <span style={{ fontWeight: "bold" }}>{boldPart}</span>
      {afterBold}
    </span>
  );
};
