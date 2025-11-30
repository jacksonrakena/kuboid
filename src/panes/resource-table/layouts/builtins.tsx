import { MRT_ColumnDef } from "mantine-react-table";
import { formatKubeAge } from "../../../util/well-known-formatters";
import { NavLink } from "react-router";
import { KubeUrlComponents, makeKubePath } from "../../../util/kube/routes";
import { WrappedLink } from "../../../util/platform";

export const Builtins = (params: KubeUrlComponents) => ({
  Prepended: [
    {
      id: "metadata-namespace",
      header: "Namespace",
      accessorFn: (row) => row.metadata?.namespace,
      Cell: ({ renderedCellValue }) => <>{renderedCellValue}</>,
      maxSize: 100,
    },
    {
      id: "metadata-name",
      header: "Name",
      accessorFn: (row) => row.metadata?.name,
      Cell: ({ renderedCellValue, row }) => (
        <WrappedLink
          to={
            "/app" +
            makeKubePath({
              ...params,
              namespace: row.original.metadata.namespace,
              name: row.original.metadata.name,
            })
          }
        >
          {renderedCellValue}
        </WrappedLink>
      ),
    },
  ] as MRT_ColumnDef<any>[],
  Appended: [
    {
      id: "metadata-age",
      header: "Age",
      accessorFn: (row) => new Date(row.metadata?.creationTimestamp),
      filterVariant: "date-range",
      Cell: ({ cell }) => <>{formatKubeAge(cell.getValue() as Date)}</>,
    },
  ] as MRT_ColumnDef<any>[],
});
