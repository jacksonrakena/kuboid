import React, { useEffect, useState } from "react";
import { makeKubePath, useKubePathParams } from "../util/kube";
import { invoke } from "@tauri-apps/api/core";
import { useAtom, useAtomValue } from "jotai";
import {
  kubernetesResourceAtom,
  useKubernetesResourceCache,
} from "../util/clientstate";
import { Box, Flex, Heading, TabNav, Tabs, Text } from "@radix-ui/themes";
import {
  Link,
  NavLink,
  Outlet,
  useInRouterContext,
  useMatch,
} from "react-router";
import { useCachedResource } from "./utils";

export const ResourceInfo = () => {
  const kubePathComponents = useKubePathParams();
  return <ResourcePage kubePathComponents={kubePathComponents} />;
};

export const ResourcePage = ({
  kubePathComponents,
}: {
  kubePathComponents: ReturnType<typeof useKubePathParams>;
}) => {
  const selfRoute = makeKubePath(kubePathComponents);
  //const cache = useKubernetesResourceCache(makeKubePath(kubePathComponents));
  const resource = useCachedResource(kubePathComponents);

  return (
    <Flex direction={"column"} style={{ width: "100%" }}>
      <Flex
        direction={"column"}
        data-tauri-drag-region
        style={{ padding: "4px" }}
      >
        <Text data-tauri-drag-region color="gray" size="2">
          <NavLink
            to={makeKubePath({
              ...kubePathComponents,
              name: "",
              namespace: "",
            })}
          >
            {kubePathComponents.resource_plural}
          </NavLink>
        </Text>
        <Heading data-tauri-drag-region>{resource?.metadata.name}</Heading>
      </Flex>
      <TabNav.Root color="gray">
        <TabLink
          rootPath={makeKubePath(kubePathComponents)}
          route={""}
          header="Overview"
        />
        <TabLink
          rootPath={makeKubePath(kubePathComponents)}
          route={"yaml"}
          header="YAML"
        />
        <TabLink
          rootPath={makeKubePath(kubePathComponents)}
          route={"events"}
          header="Events"
        />
      </TabNav.Root>
      <Outlet />
    </Flex>
  );
};

const TabLink = ({
  route,
  header,
  rootPath,
}: {
  rootPath: string;
  route: string;
  header: React.ReactNode;
}) => {
  const isMatch = useMatch(rootPath + "/" + route);
  return (
    <TabNav.Link asChild active={!!isMatch}>
      <NavLink to={route}>{header}</NavLink>
    </TabNav.Link>
  );
};
