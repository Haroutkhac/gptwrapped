'use client';

interface Props {
  label: string;
  value: string;
  subLabel?: string;
  trend?: string;
}

export default function KpiStat({ label, value, subLabel, trend }: Props) {
  return (
    <div className="bg-[#181818] hover:bg-[#282828] rounded-md p-6 transition-colors duration-200 border border-[#282828] flex flex-col min-w-0">
      <p className="m-0 text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">
        {label}
      </p>
      <h2 className="m-2 ml-0 text-4xl font-bold text-white truncate">{value}</h2>
      {subLabel && <p className="mt-1 text-sm text-[#B3B3B3]">{subLabel}</p>}
      {trend && <p className="mt-1 text-sm text-[#1DB954] font-medium">{trend}</p>}
    </div>
  );
}
