import { MRT_ColumnDef } from "mantine-react-table";
import { KubeUrlComponents, makeKubePath } from "../../../util/kube/routes";
import { WrappedLink } from "../../../util/platform";
import { TooltipKubeAge } from "../../../components/TooltipKubeAge";

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
      Cell: ({ cell }) => (
        <TooltipKubeAge creationTimestamp={cell.getValue() as string} />
      ),
    },
  ] as MRT_ColumnDef<any>[],
});

export const Commons: { [key: string]: MRT_ColumnDef<any> } = {
  Age: {
    id: "metadata-age",
    header: "Age",
    accessorFn: (row) => new Date(row.metadata?.creationTimestamp),
    filterVariant: "date-range",
    Cell: ({ cell }) => (
      <TooltipKubeAge creationTimestamp={cell.getValue() as string} />
    ),
  },
};
