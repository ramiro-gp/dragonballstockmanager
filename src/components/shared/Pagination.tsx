export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
        Anterior
      </button>
      <span>Página {page} de {pages}</span>
      <button onClick={() => onPageChange(Math.min(pages, page + 1))} disabled={page === pages}>
        Siguiente
      </button>
    </div>
  );
}
