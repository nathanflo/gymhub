/**
 * Shared form field primitives used across log, edit, and progress pages.
 */

export const inputClass =
  "w-full rounded-xl bg-neutral-800 border border-neutral-700 text-white " +
  "px-4 py-3 text-base placeholder:text-neutral-500 focus:outline-none " +
  "focus:ring-2 focus:ring-indigo-500 transition";

export const selectClass =
  "w-full rounded-xl bg-neutral-800 border border-neutral-700 text-white " +
  "px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-medium text-neutral-400">{label}</label>
      {children}
    </div>
  );
}
