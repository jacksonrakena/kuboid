import { Box, Badge, Text, Tooltip } from "@radix-ui/themes";
import { http } from "../../../App";
import { V1CustomResourceDefinition } from "@kubernetes/client-node";
import * as jpath from "jsonpath-plus";
import { WellKnownTableLayouts } from "./well-knowns";
import { MRT_ColumnDef } from "mantine-react-table";
import { makeKubePath } from "../../../util/kube/routes";
import { KubeUrlComponents } from "../../../util/kube/routes";
import { invoke } from "@tauri-apps/api/core";
import { detailResource } from "../../../util/kube/requests";
export type RowType = {
  name: string;
  help?: string;
} & ({ path: string } | { render: (item: any) => React.ReactNode });
export const discoverRows = async (
  resource: KubeUrlComponents,
  prototype: any
): Promise<MRT_ColumnDef<any>[]> => {
  if (WellKnownTableLayouts.hasOwnProperty(makeKubePath(resource))) {
    return WellKnownTableLayouts[makeKubePath(resource)].columns;
  }
  const rows: MRT_ColumnDef<any>[] = [];
  if (resource.group) {
    try {
      const crd = await detailResource<V1CustomResourceDefinition>(
        "apis",
        "apiextensions.k8s.io/v1",
        "customresourcedefinitions",
        resource.resource_plural + "." + resource.group
      );

      if (!crd.success) {
        console.log(crd.error);
      } else {
        console.log(crd.data);
        const version = crd.data.spec.versions[0];
        if (version.additionalPrinterColumns) {
          for (const col of version.additionalPrinterColumns) {
            rows.push({
              id: col.name,
              Header: () =>
                col.description ? (
                  <Tooltip
                    content={col.description || "No description available"}
                  >
                    <Text>{col.name}</Text>
                  </Tooltip>
                ) : (
                  <Text>{col.name}</Text>
                ),
              header: col.name,

              accessorFn: (item: any) => {
                return jpath.JSONPath({
                  path: "$" + col.jsonPath,
                  json: item,
                })[0];
              },
              Cell: ({ row }) => {
                const value = jpath.JSONPath({
                  path: "$" + col.jsonPath,
                  json: row.original,
                })[0];
                if (col.type === "boolean") {
                  return (
                    <Badge color={value ? "green" : "red"}>
                      {String(value)}
                    </Badge>
                  );
                }
                return <Box>{value}</Box>;
              },
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  //   if (prototype.status.conditions && prototype.status.conditions.length > 0) {
  //     const prototypeCondition = prototype.status.conditions[0];
  //     if (prototypeCondition.status) {
  //       rows.push({
  //         name: "Conditions",
  //         render: (item: any) => (
  //           <Box>{item.status.conditions.map((e) => e.type).join(", ")}</Box>
  //         ),
  //       });
  //     }
  //   }
  //   for (const key of Object.keys(prototype.status)) {
  //     if (key === "conditions") continue;
  //     if (Array.isArray(prototype.status[key])) {
  //       rows.push({
  //         name: key,
  //         render: (item: any) => {
  //           const arr = item.status ? item.status[key] : [];
  //           if (!Array.isArray(arr)) return "unknown";
  //           return (
  //             <>
  //               <Badge>{arr.length} items</Badge>
  //             </>
  //           );
  //         },
  //       });
  //       continue;
  //     }
  //     if (typeof prototype.status[key] === "boolean") {
  //       rows.push({
  //         name: key,
  //         render: (item: any) => (
  //           <>
  //             <Badge color={item.status[key] ? "green" : "red"}>
  //               {String(item.status[key])}
  //             </Badge>
  //           </>
  //         ),
  //       });
  //       continue;
  //     }
  //     if (typeof prototype.status[key] === "object") continue;
  //     rows.push({
  //       name: key,
  //       path: `status.${key}`,
  //     });
  //   }
  console.log("[Column discovery] Discovered rows for ", resource, rows);
  return rows;
};
