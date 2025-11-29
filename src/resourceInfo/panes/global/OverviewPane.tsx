import { Card, Code, DataList, Flex, Grid } from "@radix-ui/themes";
import { useCachedResource } from "../../utils";
import { makeKubePath, useKubePathParams } from "../../../util/kube";
import { formatKubeAge } from "../../../well-known-formatters";
import { NavLink } from "react-router";
import { ResourceV1Api } from "@kubernetes/client-node";
import { ObjectResourceV1Api } from "@kubernetes/client-node/dist/gen/types/ObjectParamAPI";

export const OverviewPane = () => {
  const params = useKubePathParams();
  const resource = useCachedResource(params);
  /**
   *       {
        "lastProbeTime": null,
        "lastTransitionTime": "2025-11-09T04:24:16Z",
        "observedGeneration": 1,
        "status": "True",
        "type": "PodReadyToStartContainers"
      },

           {
        "lastTransitionTime": "2025-01-17T22:58:41Z",
        "message": "ConnectorCreated",
        "observedGeneration": 1,
        "reason": "ConnectorCreated",
        "status": "True",
        "type": "ConnectorReady"
      }
   */
  return (
    <Flex style={{ padding: "8px", paddingTop: "16px" }}>
      <Card style={{ backgroundColor: "var(--slate-4)" }}>
        <DataList.Root size="2" orientation={"vertical"}>
          <Grid columns={"3"} gap="9">
            <DataList.Item>
              <DataList.Label color="gray">Age</DataList.Label>
              <DataList.Value>
                {formatKubeAge(resource.metadata?.creationTimestamp)}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label color="gray">Labels</DataList.Label>
              <DataList.Value>
                <Flex gap="2">
                  {Object.entries(resource.metadata?.labels ?? {}).map(
                    ([key, value]) => (
                      <>
                        <Code color="gray">
                          {key}: {value as string}
                        </Code>
                      </>
                    )
                  )}
                </Flex>
              </DataList.Value>
            </DataList.Item>
            {resource.metadata.namespace && (
              <DataList.Item>
                <DataList.Label color="gray">Namespace</DataList.Label>
                <DataList.Value>
                  <NavLink
                    to={makeKubePath({
                      group: "",
                      api_version: "v1",
                      resource_plural: "namespaces",
                      name: resource.metadata.namespace,
                    })}
                  >
                    {resource.metadata.namespace}
                  </NavLink>
                </DataList.Value>
              </DataList.Item>
            )}
            <DataList.Item>
              <DataList.Label color="gray">Annotations</DataList.Label>
              <DataList.Value>
                <Flex gap="2">
                  {Object.entries(resource.metadata?.annotations ?? {}).map(
                    ([key, value]) => (
                      <>
                        <Code color="gray">
                          {key}: {value as string}
                        </Code>
                      </>
                    )
                  )}
                </Flex>
              </DataList.Value>
            </DataList.Item>
            {resource.metadata.ownerReferences && (
              <>
                <DataList.Item>
                  <DataList.Label color="gray">
                    {resource.metadata.ownerReferences.length > 1
                      ? "Owners"
                      : "Owner"}
                  </DataList.Label>
                  <DataList.Value>
                    <Flex gap="2">
                      {JSON.stringify(resource.metadata.ownerReferences)}
                    </Flex>
                  </DataList.Value>
                </DataList.Item>
              </>
            )}
          </Grid>
        </DataList.Root>
      </Card>
    </Flex>
  );
};
