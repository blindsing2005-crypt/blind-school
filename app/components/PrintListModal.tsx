'use client';
import { useEffect, useState } from 'react';
import { useSchoolSettings } from '../lib/store';

export interface PrintColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface PrintRow {
  [key: string]: string | number;
}

export default function PrintListModal({
  title,
  subtitle,
  columns,
  rows,
  totalsRow,
  extraInfo,
  onClose,
}: {
  title: string;
  subtitle?: string;
  columns: PrintColumn[];
  rows: PrintRow[];
  totalsRow?: PrintRow;
  extraInfo?: string;
  onClose: () => void;
}) {
  const [settings] = useSchoolSettings();
  const schoolName = settings.schoolName || 'BLIND SCHOOL';
  const schoolLogo = settings.schoolLogo;

  const [editDate, setEditDate] = useState('');
  useEffect(() => {
    setEditDate(new Date().toLocaleString('fr-FR'));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/70 p-4 print:bg-white print:p-0">
      <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 print:hidden">
          <div>
            <p className="text-sm font-semibold">Aperçu avant impression</p>
            <p className="text-xs text-slate-500">{rows.length} ligne(s)</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Fermer
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              🖨️ Imprimer
            </button>
          </div>
        </div>

        <div className="print-area p-8 print:p-4">
          <div className="mb-5 flex items-center gap-4 border-b-2 border-slate-800 pb-4">
            {schoolLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={schoolLogo} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-slate-800 text-lg font-bold text-white">
                {schoolName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold uppercase">{schoolName}</h1>
              <p className="text-sm font-semibold">{title}</p>
              {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Édité le</p>
              <p className="font-medium text-slate-700">{editDate || '…'}</p>
            </div>
          </div>

          {extraInfo && <p className="mb-3 text-xs text-slate-600 italic">{extraInfo}</p>}

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-y-2 border-slate-800 bg-slate-100">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: c.width, textAlign: c.align || 'left' }}
                    className="border border-slate-300 px-2 py-1.5 font-semibold uppercase tracking-wider"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      style={{ textAlign: c.align || 'left' }}
                      className="border border-slate-200 px-2 py-1.5"
                    >
                      {row[c.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totalsRow && (
              <tfoot>
                <tr className="border-t-2 border-slate-800 bg-slate-100 font-bold">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      style={{ textAlign: c.align || 'left' }}
                      className="border border-slate-300 px-2 py-2"
                    >
                      {totalsRow[c.key] ?? ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>

          <div className="mt-6 flex items-end justify-between text-[10px] text-slate-400">
            <p>Document généré par {schoolName}</p>
            <p>Page 1 / 1</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { margin: 0; padding: 0; background: #fff; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute; left: 0; top: 0;
            width: 100%;
            padding: 0 !important;
          }
          .print-area table { page-break-inside: auto; }
          .print-area tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}