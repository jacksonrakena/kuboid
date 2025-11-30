import React, { createContext } from "react";

import { makeKubePath, useKubePathParams } from "../../util/kube/routes";
import { Box, Flex, Heading, TabNav, Text } from "@radix-ui/themes";
import { NavLink, Outlet, useMatch } from "react-router";
import { useCachedResourceAndStartWatch } from "../../util/kube/cache";
import { WrappedLink } from "../../util/platform";
import { GenericKubernetesResource } from "../../util/kube/types";
import { ResourceInfoPageContext } from "./ResourceInfoContext";

export const ResourceInfo = () => {
  const kubePathComponents = useKubePathParams();
  console.log("ResourceInfo render", kubePathComponents);
  return <ResourcePage kubePathComponents={kubePathComponents} />;
};

export const ResourcePage = ({
  kubePathComponents,
}: {
  kubePathComponents: ReturnType<typeof useKubePathParams>;
}) => {
  const resource = useCachedResourceAndStartWatch(kubePathComponents);

  if (!resource) {
    return <Box style={{ padding: "16px" }}>Resource unavailable in cache</Box>;
  }

  return (
    <Flex direction={"column"} style={{ width: "100%", height: "100%" }}>
      <Flex
        direction={"column"}
        data-tauri-drag-region
        style={{ padding: "16px" }}
      >
        <Text data-tauri-drag-region size="2">
          <WrappedLink
            to={
              "/app" +
              makeKubePath({
                ...kubePathComponents,
                name: "",
                namespace: "",
              })
            }
          >
            {kubePathComponents.resource_plural}
          </WrappedLink>
        </Text>
        <Heading data-tauri-drag-region>{resource?.metadata.name}</Heading>
      </Flex>
      <TabNav.Root>
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
      <ResourceInfoPageContext.Provider value={{ resource }}>
        <Outlet />
      </ResourceInfoPageContext.Provider>
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
  const isMatch = useMatch("/app" + rootPath + "/" + route);
  return (
    <TabNav.Link asChild active={!!isMatch}>
      <NavLink to={route}>{header}</NavLink>
    </TabNav.Link>
  );
};
