import { Avatar, Box, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { KubePathParams, KubeUrlComponents } from "../util/kube/routes";
import { useResourceList } from "../util/kube/subscriptions";
import {
  KubernetesObject,
  V1CustomResourceDefinition,
  V1PersistentVolumeClaim,
} from "@kubernetes/client-node";
import { useMemo } from "react";

export const Overview = () => {
  return (
    <>
      <Box
        style={{ width: "100%", backgroundColor: "white", height: "40px" }}
        data-tauri-drag-region
      ></Box>

      <Flex direction={"column"} gap="6" style={{ padding: "16px" }}>
        {/* <Box>
          <Heading>Resource usage</Heading>
          <Box></Box>
        </Box> */}
        <Flex direction={"column"} gap="4">
          <Heading>Resource status</Heading>

          <Grid columns={"4"} gap="4">
            <ResourceCountCard
              resource={{
                api_version: "v1",
                resource_plural: "pods",
                group: "",
              }}
              stateDefinitions={[
                { name: "Active", color: "var(--green-9)" },
                {
                  name: "Terminating",
                  color: "var(--red-9)",
                },
              ]}
              getState={(i: KubernetesObject) => "Active"}
            />
            {/** pvc */}
            <ResourceCountCard
              resource={{
                api_version: "v1",
                resource_plural: "persistentvolumeclaims",
                group: "",
              }}
              stateDefinitions={[
                { name: "Bound", color: "var(--green-9)" },
                { name: "Pending", color: "var(--yellow-11)" },
                {
                  name: "Lost",
                  color: "var(--red-9)",
                },
              ]}
              getState={(i: V1PersistentVolumeClaim) => {
                const phase = i.status?.phase;
                if (phase === "Bound") {
                  return "Bound";
                }
                if (phase === "Pending") {
                  return "Pending";
                }
                if (phase === "Lost") {
                  return "Lost";
                }
                return "Unknown";
              }}
            />
            {/** nodes */}

            <ResourceCountCard
              resource={{
                api_version: "v1",
                resource_plural: "nodes",
                group: "",
              }}
              stateDefinitions={[
                { name: "Ready", color: "var(--green-9)" },
                { name: "NotReady", color: "var(--red-9)" },
              ]}
              getState={(i: KubernetesObject) => {
                const conditions = (i as any).status?.conditions;
                if (conditions) {
                  const readyCondition = conditions.find(
                    (c: any) => c.type === "Ready"
                  );
                  if (readyCondition) {
                    return readyCondition.status === "True"
                      ? "Ready"
                      : "NotReady";
                  }
                }
                return "Unknown";
              }}
            />
            {/** customresourcedefinitions */}
            <ResourceCountCard
              resource={{
                api_version: "apiextensions.k8s.io/v1",
                resource_plural: "customresourcedefinitions",
                group: "apiextensions.k8s.io",
              }}
              stateDefinitions={[
                { name: "Active", color: "var(--green-9)" },
                {
                  name: "Terminating",
                  color: "var(--red-9)",
                },
              ]}
              getState={(i: V1CustomResourceDefinition) => {
                if (
                  i.status?.conditions?.some(
                    (e) => e.type === "Terminating" && e.status === "True"
                  )
                ) {
                  return "Terminating";
                }
                return "Active";
              }}
            />
            {/** replicasets */}
            <ResourceCountCard
              resource={{
                api_version: "apps/v1",
                resource_plural: "replicasets",
                group: "apps",
              }}
              stateDefinitions={[
                { name: "Ready", color: "var(--green-9)" },
                { name: "NotReady", color: "var(--red-9)" },
              ]}
              getState={(i: KubernetesObject) => {
                const status = (i as any).status;
                if (status?.replicas === status?.readyReplicas) {
                  return "Ready";
                }
                return "NotReady";
              }}
            />
            {/** daemonsets */}
            <ResourceCountCard
              resource={{
                api_version: "apps/v1",
                resource_plural: "daemonsets",
                group: "apps",
              }}
              stateDefinitions={[
                { name: "Ready", color: "var(--green-9)" },
                { name: "NotReady", color: "var(--red-9)" },
              ]}
              getState={(i: KubernetesObject) => {
                const status = (i as any).status;
                if (status?.numberReady === status?.desiredNumberScheduled) {
                  return "Ready";
                }
                return "NotReady";
              }}
            />
            {/** statefulsets */}
            <ResourceCountCard
              resource={{
                api_version: "apps/v1",
                resource_plural: "statefulsets",
                group: "apps",
              }}
              stateDefinitions={[
                { name: "Ready", color: "var(--green-9)" },
                { name: "NotReady", color: "var(--red-9)" },
              ]}
              getState={(i: KubernetesObject) => {
                const status = (i as any).status;
                if (status?.replicas === status?.readyReplicas) {
                  return "Ready";
                }
                return "NotReady";
              }}
            />
            {/** cronjobs */}
            <ResourceCountCard
              resource={{
                api_version: "batch/v1",
                resource_plural: "cronjobs",
                group: "batch",
              }}
              stateDefinitions={[
                { name: "Active", color: "var(--green-9)" },
                { name: "Suspended", color: "var(--yellow-11)" },
              ]}
              getState={(i: KubernetesObject) => {
                const spec = (i as any).spec;
                if (spec?.suspend === true) {
                  return "Suspended";
                }
                return "Active";
              }}
            />
            {/** jobs */}
            <ResourceCountCard
              resource={{
                api_version: "batch/v1",
                resource_plural: "jobs",
                group: "batch",
              }}
              stateDefinitions={[
                { name: "Complete", color: "var(--green-9)" },
                { name: "Failed", color: "var(--red-9)" },
                { name: "Running", color: "var(--blue-9)" },
              ]}
              getState={(i: KubernetesObject) => {
                const status = (i as any).status;
                if (status?.succeeded) {
                  return "Complete";
                }
                if (status?.failed) {
                  return "Failed";
                }
                return "Running";
              }}
            />
            {/** resourcequotas */}
            <ResourceCountCard
              resource={{
                api_version: "v1",
                resource_plural: "resourcequotas",
                group: "",
              }}
              stateDefinitions={[{ name: "Active", color: "var(--green-9)" }]}
              getState={(i: KubernetesObject) => "Active"}
            />
          </Grid>
        </Flex>
      </Flex>
    </>
  );
};

const ResourceCountCard = <T extends KubernetesObject>(props: {
  resource: KubeUrlComponents;
  stateDefinitions: { name: string; color: string }[];
  getState: (item: T) => string;
}) => {
  const resourceList = useResourceList(props.resource);
  const collectedStates = useMemo(() => {
    const stateCount: Record<string, number> = {};
    if (resourceList.resources.length === 0) {
      return stateCount;
    }
    for (const resDef of props.stateDefinitions) {
      stateCount[resDef.name] = 0;
    }
    for (const resource of resourceList.resources) {
      const state = props.getState(resource as T);
      if (stateCount.hasOwnProperty(state)) {
        stateCount[state] += 1;
      } else {
        stateCount[state] = 1;
      }
    }
    return stateCount;
  }, [resourceList]);
  return (
    <>
      <Card>
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold">
            {props.resource.resource_plural}
          </Text>
          <Text size="1" color="gray">
            Total: {resourceList.resources.length}
          </Text>
          <Box
            style={{
              width: "100%",
              height: "20px",
              display: "flex",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            {props.stateDefinitions.map((stateDef) => {
              const count = collectedStates[stateDef.name] || 0;
              const percentage =
                resourceList.resources.length > 0
                  ? (count / resourceList.resources.length) * 100
                  : 0;

              if (percentage === 0) return null;

              return (
                <Box
                  key={stateDef.name}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: stateDef.color,
                    height: "100%",
                  }}
                  title={`${stateDef.name}: ${count}`}
                />
              );
            })}
          </Box>
          <Flex gap="2" wrap="wrap" direction={"column"}>
            {props.stateDefinitions.map((stateDef) => {
              const count = collectedStates[stateDef.name] || 0;
              return (
                <Flex key={stateDef.name} align="center" gap="1">
                  {/* <Box
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: stateDef.color,
                      borderRadius: "2px",
                    }}
                  /> */}
                  <Text size="1" style={{ color: stateDef.color }}>
                    {count} {stateDef.name}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        </Flex>
      </Card>
    </>
  );
};
