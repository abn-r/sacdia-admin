import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // Lets column defs carry responsive classes (e.g. "hidden xl:table-cell")
  // that the page applies to both the header and every cell of that column.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends unknown, TValue> {
    className?: string;
  }
}
