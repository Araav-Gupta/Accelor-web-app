import React from 'react';

function Pagination({ currentPage, itemsPerPage, totalItems, onPageChange, onPageSizeChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages === 0) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center space-x-2">
        <label htmlFor="pageSize" className="text-sm">Rows per page:</label>
        <select
          id="pageSize"
          value={itemsPerPage}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border border-border bg-white dark:bg-black text px-2 py-1 rounded-md"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="flex items-center space-x-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-md border ${
              page === currentPage
                ? 'bg-white dark:bg-black text'
                : 'bg-white dark:bg-black text'
            }`}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Pagination;
