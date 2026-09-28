"use client";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type PageToken = number | "ellipsis";

type CampaignPaginationProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

function getPageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, index) => index + 1);

  const start = currentPage <= 4 ? 2 : currentPage - 1;
  const end = currentPage >= totalPages - 3 ? totalPages - 1 : currentPage + 1;
  const pages: PageToken[] = [1];

  if (start > 2) pages.push("ellipsis");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

export function CampaignPagination({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: CampaignPaginationProps) {
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const pageTokens = getPageTokens(currentPage, totalPages);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  function changePage(
    event: React.MouseEvent<HTMLAnchorElement>,
    page: number,
  ) {
    event.preventDefault();
    onPageChange(page);
  }

  return (
    <div className="border-t border-[var(--line-soft)] px-4 py-3 sm:px-5">
      <Pagination aria-label="Paginação de campanhas" className="mx-0">
        <PaginationContent className="w-full flex-wrap justify-between gap-3">
          <PaginationItem>
            <span className="text-[10px] text-[var(--text-muted)]">
              Exibindo{" "}
              <strong className="font-semibold text-[var(--ink)]">
                {firstItem}–{lastItem}
              </strong>{" "}
              de {totalItems} campanhas
            </span>
          </PaginationItem>

          <PaginationItem className="flex items-center gap-1">
            <PaginationPrevious
              href="#campaigns-page-previous"
              text="Anterior"
              aria-disabled={!hasPreviousPage}
              tabIndex={hasPreviousPage ? 0 : -1}
              className={
                hasPreviousPage ? "" : "pointer-events-none opacity-45"
              }
              onClick={(event) =>
                changePage(event, Math.max(1, currentPage - 1))
              }
            />
            {pageTokens.map((page, index) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    href={`#campaigns-page-${page}`}
                    isActive={page === currentPage}
                    aria-label={`Página ${page}`}
                    onClick={(event) => changePage(event, page)}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationNext
              href="#campaigns-page-next"
              text="Próxima"
              aria-disabled={!hasNextPage}
              tabIndex={hasNextPage ? 0 : -1}
              className={hasNextPage ? "" : "pointer-events-none opacity-45"}
              onClick={(event) =>
                changePage(event, Math.min(totalPages, currentPage + 1))
              }
            />
          </PaginationItem>

          <PaginationItem className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)]">
              Por página
            </span>
            <NativeSelect
              aria-label="Campanhas por página"
              className="w-[88px]"
              size="sm"
              value={pageSize}
              onChange={(event) =>
                onPageSizeChange(Number(event.currentTarget.value))
              }
            >
              {[10, 20, 50, 100].map((size) => (
                <NativeSelectOption key={size} value={size}>
                  {size}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
