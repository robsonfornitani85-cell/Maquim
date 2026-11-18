import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, FilterX } from 'lucide-react';
import { normalizeSearch } from '../utils/validation';

export interface DataColumn<T> {
  key: string;
  label: string;
  /** Valor usado para ordenar e filtrar */
  value?: (row: T) => string | number | undefined | null;
  render?: (row: T) => React.ReactNode;
  /** 'text' = digitar para filtrar; 'select' = lista com os valores existentes; false = sem filtro */
  filter?: 'text' | 'select' | false;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T, index: number) => string;
  rowClassName?: (row: T) => string;
  emptyText?: string;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/**
 * Tabela com ordenação (toque no título da coluna: crescente → decrescente → original)
 * e filtro por coluna (linha de filtros logo abaixo dos títulos).
 */
export function DataTable<T>({ rows, columns, rowKey, rowClassName, emptyText = 'Nenhum registro encontrado.' }: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const strValue = (col: DataColumn<T>, row: T) => {
    const v = col.value ? col.value(row) : '';
    return v === undefined || v === null ? '' : String(v);
  };

  const selectOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    columns.forEach((c) => {
      if (c.filter === 'select' && c.value) {
        out[c.key] = Array.from(new Set(rows.map((r) => strValue(c, r)))).sort((a, b) => collator.compare(a, b));
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns]);

  const processed = useMemo(() => {
    let list = rows.map((r, i) => ({ r, i }));
    const active = Object.entries(filters).filter(([, v]) => v !== '');
    if (active.length) {
      list = list.filter(({ r }) =>
        active.every(([key, f]) => {
          const col = columns.find((c) => c.key === key);
          if (!col) return true;
          const v = strValue(col, r);
          if (col.filter === 'select') return v === f;
          return normalizeSearch(v).includes(normalizeSearch(f));
        })
      );
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        list = [...list].sort((a, b) => {
          const va = col.value ? col.value(a.r) : '';
          const vb = col.value ? col.value(b.r) : '';
          const ea = va === '' || va === undefined || va === null;
          const eb = vb === '' || vb === undefined || vb === null;
          if (ea && eb) return a.i - b.i;
          if (ea) return 1; // vazios sempre no fim
          if (eb) return -1;
          const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : collator.compare(String(va), String(vb));
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, filters, sort]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const hasFilters = Object.values(filters).some((v) => v !== '') || sort !== null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>
          Mostrando <strong className="text-slate-800">{processed.length}</strong> de {rows.length} linhas
          {sort && (
            <>
              {' '}· ordenado por <strong>{columns.find((c) => c.key === sort.key)?.label}</strong> ({sort.dir === 'asc' ? 'crescente' : 'decrescente'})
            </>
          )}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setFilters({});
              setSort(null);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
          >
            <FilterX className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              {columns.map((c) => {
                const sortable = c.sortable !== false && !!c.value;
                const ativo = sort?.key === c.key;
                return (
                  <th key={c.key} className={`p-0 align-bottom ${c.headerClassName || ''}`}>
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={`w-full p-3 flex items-center gap-1 text-left uppercase whitespace-nowrap hover:bg-slate-200/70 ${ativo ? 'text-blue-800' : ''}`}
                        title="Toque para ordenar"
                      >
                        {c.label}
                        {ativo ? (
                          sort!.dir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    ) : (
                      <span className="block p-3 whitespace-nowrap">{c.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-1.5 font-normal">
                  {c.filter === 'select' ? (
                    <select
                      value={filters[c.key] || ''}
                      onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                      className={`w-full min-w-[90px] px-1.5 py-1 rounded-md border text-[11px] ${filters[c.key] ? 'border-blue-400 bg-blue-50 font-bold' : 'border-slate-200 bg-white'}`}
                    >
                      <option value="">Todos</option>
                      {(selectOptions[c.key] || []).map((o) => (
                        <option key={o} value={o}>
                          {o || '(vazio)'}
                        </option>
                      ))}
                    </select>
                  ) : c.filter === 'text' || (c.filter === undefined && c.value) ? (
                    <input
                      type="search"
                      value={filters[c.key] || ''}
                      onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                      placeholder="Filtrar..."
                      className={`w-full min-w-[80px] px-1.5 py-1 rounded-md border text-[11px] ${filters[c.key] ? 'border-blue-400 bg-blue-50 font-bold' : 'border-slate-200 bg-white'}`}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processed.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              processed.map(({ r, i }) => (
                <tr key={rowKey(r, i)} className={`hover:bg-slate-50/80 transition-colors ${rowClassName ? rowClassName(r) : ''}`}>
                  {columns.map((c) => (
                    <td key={c.key} className={`p-3 ${c.className || ''}`}>
                      {c.render ? c.render(r) : strValue(c, r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
