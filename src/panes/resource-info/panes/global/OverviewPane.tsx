import {
  Button,
  Card,
  Code,
  DataList,
  Flex,
  Grid,
  Popover,
  Table,
} from "@radix-ui/themes";
import { useCachedResource } from "../../../../util/kube/cache";
import { useKubePathParams } from "../../../../util/kube/routes";
import { makeKubePath } from "../../../../util/kube/routes";
import { formatKubeAge } from "../../../../util/well-known-formatters";
import { NavLink } from "react-router";

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
                  <KeyValueExpander data={resource.metadata?.labels ?? {}} />
                </Flex>
              </DataList.Value>
            </DataList.Item>
            {resource.metadata.namespace && (
              <DataList.Item>
                <DataList.Label color="gray">Namespace</DataList.Label>
                <DataList.Value>
                  <NavLink
                    to={
                      "/app" +
                      makeKubePath({
                        group: "",
                        api_version: "v1",
                        resource_plural: "namespaces",
                        name: resource.metadata.namespace,
                      })
                    }
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
                  <KeyValueExpander
                    data={resource.metadata?.annotations ?? {}}
                  />
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

const KeyValueExpander = ({ data }: { data: Record<string, string> }) => {
  const records = Object.entries(data);
  return (
    <Flex direction="column" gap="1">
      {records.slice(0, 3).map(([key, value]) => (
        <Flex style={{ maxWidth: "250px" }}>
          <Code color="gray" truncate>
            {key}: {value as string}
          </Code>
        </Flex>
      ))}

      {records.length > 0 && (
        <Popover.Root>
          <Popover.Trigger>
            <Button variant="surface" color="gray" size={"1"}>
              View all
            </Button>
          </Popover.Trigger>
          <Popover.Content width="600px">
            <Table.Root variant="surface">
              <Table.Body>
                {records.map(([key, value]) => (
                  <Table.Row>
                    <Table.RowHeaderCell>{key}</Table.RowHeaderCell>
                    <Table.Cell>
                      <Code color="gray">{value as string}</Code>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Popover.Content>
        </Popover.Root>
      )}
    </Flex>
  );
};
