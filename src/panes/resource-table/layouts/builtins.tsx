import { MRT_ColumnDef } from "mantine-react-table";
import { formatKubeAge } from "../../../util/well-known-formatters";

export const Builtins = {
  Prepended: [
    {
      id: "metadata-namespace",
      header: "Namespace",
      accessorFn: (row) => row.metadata?.namespace,
      Cell: ({ renderedCellValue }) => <>{renderedCellValue}</>,
      maxSize: 60,
    },
    {
      id: "metadata-name",
      header: "Name",
      accessorFn: (row) => row.metadata?.name,
      Cell: ({ renderedCellValue }) => <>{renderedCellValue}</>,
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
};
