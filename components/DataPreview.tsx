'use client';

interface DataPreviewProps {
  headers: string[];
  rows: Record<string, string>[];
  maxRows?: number;
}

export default function DataPreview({
  headers,
  rows,
  maxRows = 5,
}: DataPreviewProps) {
  const displayRows = rows.slice(0, maxRows);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Data Preview
        </h3>
        <span className="text-xs text-slate-400">
          Showing {displayRows.length} of {rows.length} rows
        </span>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                {headers.map((h) => (
                  <td
                    key={h}
                    className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[200px] truncate"
                  >
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
