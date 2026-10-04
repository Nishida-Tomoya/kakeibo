import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, formatMonth } from '../utils.ts';

export function MonthSelector({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="card flex items-center justify-between p-2">
      <button onClick={() => onChange(addMonths(month, -1))} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="前の月">
        <ChevronLeft size={20} />
      </button>
      <h2 className="text-base font-bold">{formatMonth(month)}</h2>
      <button onClick={() => onChange(addMonths(month, 1))} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="次の月">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle size={18} className="mr-2 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function SuccessMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-center rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
      <CheckCircle size={18} className="mr-2 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <div className={`h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
