import { V1Pod } from "@kubernetes/client-node";
import { RowType } from "./row-discovery";
import { Badge } from "@radix-ui/themes";
import { formatKubeAge } from "./well-known-formatters";
import { MRT_ColumnDef } from "mantine-react-table";

export const WellKnownResources: {
  [key: string]: {
    rows: MRT_ColumnDef<any>[];
  };
} = {
  "v1/pods": {
    rows: [
      {
        id: "ready",
        header: "Ready",
        accessorFn: (item: V1Pod) => {
          const total = item.status?.containerStatuses?.length || 0;
          const ready =
            item.status?.containerStatuses?.filter((cs) => cs.ready).length ||
            0;
          return { ready: ready, total: total };
        },
        //help: 'The number of ready containers for the pod. A pod is considered "Ready" when all containers are ready.',

        Cell: ({ renderedCellValue, row }) => {
          const total = row.original.status?.containerStatuses?.length || 0;
          const ready =
            row.original.status?.containerStatuses?.filter((cs) => cs.ready)
              .length || 0;
          const color = total === ready && total > 0 ? "green" : "red";
          return <Badge color={color}>{`${ready}/${total}`}</Badge>;
        },
      },
      // {
      //   name: "Status",
      //   help: "The overall phase of the pod.",
      //   render: (item: V1Pod) => {
      //     const status = item.status?.phase || "Unknown";
      //     let color: "red" | "green" | "yellow" | "gray" = "gray";
      //     if (status === "Running") color = "green";
      //     else if (status === "Pending") color = "yellow";
      //     else if (status === "Failed") color = "red";
      //     return <Badge color={color}>{status}</Badge>;
      //   },
      // },
      // {
      //   name: "Restarts",
      //   help: "The total number of container restarts for the pod.",
      //   render: (item: V1Pod) => {
      //     const restarts =
      //       item.status?.containerStatuses
      //         ?.map((e) => e.restartCount)
      //         .reduce((a, b) => a + b, 0) || 0;
      //     return <>{restarts}</>;
      //   },
      // },
      // {
      //   name: "Last Restart",
      //   render: (item: V1Pod) => {
      //     const restartTimes =
      //       item.status?.containerStatuses
      //         ?.map((cs) => cs.lastState?.terminated?.finishedAt)
      //         .filter((t): t is string => t !== undefined)
      //         .map((t) => new Date(t).getTime()) || [];
      //     if (restartTimes.length === 0) {
      //       return <>-</>;
      //     }
      //     return <>{formatKubeAge(new Date(Math.max(...restartTimes)))}</>;
      //   },
      // },
      // {
      //   name: "Last Restart Reason",
      //   render: (item: V1Pod) => {
      //     const restartReasons =
      //       item.status?.containerStatuses
      //         ?.map((cs) => cs.lastState?.terminated)
      //         .filter((t) => !!t) ?? [];
      //     if (restartReasons.length === 0) {
      //       return <>-</>;
      //     }
      //     return (
      //       <>
      //         {restartReasons
      //           .map((r) => `${r.reason} (${r.exitCode})`)
      //           .join(", ")}
      //       </>
      //     );
      //   },
      // },
      // {
      //   name: "Node",
      //   render: (item: V1Pod) => {
      //     return <>{item.spec?.nodeName || "Unknown"}</>;
      //   },
      // },
    ],
  },
  "v1/namespaces": {
    rows: [
      {
        name: "Phase",
        render: (item: any) => {
          const phase = item.status?.phase || "Unknown";
          let color: "red" | "green" | "yellow" | "gray" = "gray";
          if (phase === "Active") color = "green";
          else if (phase === "Terminating") color = "yellow";
          return <Badge color={color}>{phase}</Badge>;
        },
      },
    ],
  },
};
