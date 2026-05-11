'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LucideIcon } from 'lucide-react';

export interface DataColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  pagination?: {
    pageSize?: number;
  };
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
}

type SortDirection = 'asc' | 'desc' | null;

const PAGE_SIZE = 10;

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  searchable = true,
  searchPlaceholder,
  pagination,
  emptyIcon: EmptyIcon = Inbox,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  const { t, isRTL } = useLanguageStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = pagination?.pageSize ?? PAGE_SIZE;

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const value = row[col.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = sortedData.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // Reset page when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Search Bar */}
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder ?? `${t('search')}...`}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.sortable && 'cursor-pointer select-none hover:bg-muted/80',
                    col.sortable && 'w-auto'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.sortable && sortKey === col.key && (
                      <>
                        {sortDir === 'asc' && (
                          <ChevronUp className="size-3.5" />
                        )}
                        {sortDir === 'desc' && (
                          <ChevronDown className="size-3.5" />
                        )}
                      </>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-40 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <EmptyIcon className="size-10 stroke-1" />
                    <p className="font-medium">
                      {emptyTitle ?? t('no_data')}
                    </p>
                    {emptyDescription && (
                      <p className="text-sm">{emptyDescription}</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, idx) => (
                <TableRow
                  key={idx}
                  className={cn(
                    'transition-colors',
                    onRowClick &&
                      'cursor-pointer hover:bg-muted/50'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] as React.ReactNode) ?? '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {sortedData.length > pageSize && (
        <div
          className={cn(
            'flex items-center justify-between text-sm text-muted-foreground',
            isRTL && 'flex-row-reverse'
          )}
        >
          <span>
            {isRTL
              ? `نمایش ${((safeCurrentPage - 1) * pageSize) + 1}-${Math.min(safeCurrentPage * pageSize, sortedData.length)} از ${sortedData.length}`
              : `Showing ${((safeCurrentPage - 1) * pageSize) + 1}-${Math.min(safeCurrentPage * pageSize, sortedData.length)} of ${sortedData.length}`}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
            >
              {isRTL ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </Button>

            {/* Page Numbers */}
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 3) {
                pageNum = i + 1;
              } else if (safeCurrentPage <= 2) {
                pageNum = i + 1;
              } else if (safeCurrentPage >= totalPages - 1) {
                pageNum = totalPages - 2 + i;
              } else {
                pageNum = safeCurrentPage - 1 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={safeCurrentPage === pageNum ? 'default' : 'outline'}
                  size="icon"
                  className="size-8"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              {isRTL ? (
                <ChevronLeft className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
