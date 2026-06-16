import type { TableColumn } from '@/types';
import { cn } from '@/utils/cn';

interface TableProps<TData> {
  columns: TableColumn<TData>[];
  data: TData[];
  getRowKey: (row: TData) => string;
  loading?: boolean;
  emptyMessage?: string;
}

export default function Table<TData>({
  columns,
  data,
  getRowKey,
  loading = false,
  emptyMessage = 'Aucune donnee disponible.',
}: TableProps<TData>) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="border-b border-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <tr key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <td key={`${column.key}-${index}`} className="border-b border-border px-4 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-navy/10" />
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!loading && !data.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-muted" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : null}

          {!loading
            ? data.map((row) => (
                <tr key={getRowKey(row)} className="transition hover:bg-navy-soft/70">
                  {columns.map((column) => (
                    <td
                      key={`${getRowKey(row)}-${column.key}`}
                      className={cn(
                        'border-b border-border px-4 py-4 align-top text-sm text-navy',
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  );
}
