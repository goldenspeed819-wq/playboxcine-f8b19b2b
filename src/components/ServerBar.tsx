import { Server } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  options: { name: string; available: boolean }[];
  /** -1 = fonte original do site */
  active: number;
  hasOriginal: boolean;
  onSelect: (index: number) => void;
};

export default function ServerBar({ options, active, hasOriginal, onSelect }: Props) {
  if (!hasOriginal && options.length === 0) return null;
  const btn = (selected: boolean, disabled?: boolean) =>
    cn(
      'shrink-0 min-h-[40px] px-4 rounded-lg text-sm font-medium border transition-colors touch-manipulation',
      selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/60 text-foreground border-border hover:border-primary',
      disabled && 'opacity-40 pointer-events-none',
    );
  return (
    <div className="w-full max-w-full">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Server className="w-3.5 h-3.5" /> Servidores — se travar ou der erro, troque aqui
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {hasOriginal && (
          <button type="button" className={btn(active === -1)} onClick={() => onSelect(-1)}>Principal</button>
        )}
        {options.map((o, i) => (
          <button key={i} type="button" className={btn(active === i, !o.available)} onClick={() => onSelect(i)}>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}
