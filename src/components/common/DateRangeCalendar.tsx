import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, toYMD } from '../../data/seedData';

interface DateRangeCalendarProps {
  startYmd: string;
  endYmd: string;
  onChangeRange: (nextStartYmd: string, nextEndYmd: string, nights: number) => void;
  blockedRanges?: { start: string; end: string; label: string }[];
}

export function diffDaysYmd(a: string, b: string): number {
  const d1 = new Date(`${a}T12:00:00`);
  const d2 = new Date(`${b}T12:00:00`);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function addDaysYmd(ymd: string, delta: number): string {
  return toYMD(addDays(new Date(`${ymd}T12:00:00`), delta));
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({
  startYmd,
  endYmd,
  onChangeRange,
  blockedRanges = [],
}) => {
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = startYmd ? new Date(`${startYmd}T12:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const [dragHover, setDragHover] = useState<string | null>(null);
  const [clickAnchor, setClickAnchor] = useState<string | null>(null);

  useEffect(() => {
    if (!dragAnchor) return;
    const handleUp = () => {
      const target = dragHover || dragAnchor;
      if (target === dragAnchor) {
        // Single click: toggle two-step click range selection
        if (!clickAnchor || target <= clickAnchor) {
          setClickAnchor(target);
          onChangeRange(target, addDaysYmd(target, 1), 1);
        } else {
          const nights = Math.max(1, diffDaysYmd(clickAnchor, target));
          onChangeRange(clickAnchor, target, nights);
          setClickAnchor(null);
        }
      } else {
        const minYmd = dragAnchor < target ? dragAnchor : target;
        const maxYmd = dragAnchor < target ? target : dragAnchor;
        const nights = Math.max(1, diffDaysYmd(minYmd, maxYmd));
        onChangeRange(minYmd, maxYmd, nights);
        setClickAnchor(null);
      }
      setDragAnchor(null);
      setDragHover(null);
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [dragAnchor, dragHover, clickAnchor, onChangeRange]);

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
    const offset = (firstDay.getDay() + 6) % 7;

    const cells: { ymd: string; day: number; inMonth: boolean }[] = [];
    for (let i = offset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ ymd: toYMD(d), day: d.getDate(), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ ymd: toYMD(d), day, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      const nextYmd = addDaysYmd(last.ymd, 1);
      const nextDate = new Date(`${nextYmd}T12:00:00`);
      cells.push({ ymd: nextYmd, day: nextDate.getDate(), inMonth: false });
    }
    return cells;
  }, [viewMonth]);

  const previewStart =
    dragAnchor && dragHover && dragAnchor !== dragHover
      ? dragAnchor < dragHover
        ? dragAnchor
        : dragHover
      : startYmd;
  const previewEnd =
    dragAnchor && dragHover && dragAnchor !== dragHover
      ? dragAnchor < dragHover
        ? dragHover
        : dragAnchor
      : endYmd;

  const previewNights = Math.max(1, diffDaysYmd(previewStart, previewEnd));
  const monthLabel = viewMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const todayYmd = toYMD(new Date());

  return (
    <div className="select-none rounded-xl border border-[#E2D2AF] bg-[#FAF7F0] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
          }
          className="rounded-lg border border-[#DECFA8] bg-white p-1 text-[#5C4A33] hover:bg-[#FBF5E6]"
          title="Mes anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="text-center">
          <p className="text-xs font-bold capitalize text-[#2A2015]">{monthLabel}</p>
          <p className="text-[10px] text-[#6E5D47]">
            Arrastre de inicio a salida ({previewNights} noche{previewNights === 1 ? '' : 's'})
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
          }
          className="rounded-lg border border-[#DECFA8] bg-white p-1 text-[#5C4A33] hover:bg-[#FBF5E6]"
          title="Mes siguiente"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#7A684D]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell) => {
          const isStart = cell.ymd === previewStart;
          const isEnd = cell.ymd === previewEnd;
          const isInStay = cell.ymd >= previewStart && cell.ymd < previewEnd;
          const isToday = cell.ymd === todayYmd;
          const blockedMatch = blockedRanges.find(
            (b) => cell.ymd >= b.start && cell.ymd < b.end
          );

          return (
            <button
              key={cell.ymd}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                setDragAnchor(cell.ymd);
                setDragHover(cell.ymd);
              }}
              onPointerEnter={() => {
                if (dragAnchor) {
                  setDragHover(cell.ymd);
                }
              }}
              title={
                blockedMatch
                  ? `Ocupado por: ${blockedMatch.label}`
                  : isStart
                    ? 'Fecha de Entrada'
                    : isEnd
                      ? 'Fecha de Salida'
                      : cell.ymd
              }
              className={`relative flex h-8 flex-col items-center justify-center rounded-md text-[11px] font-mono transition-colors ${
                isStart
                  ? 'bg-[#3A2B18] font-bold text-white ring-2 ring-[#C89B2B]'
                  : isInStay
                    ? 'bg-[#9A6E0E] font-bold text-white'
                    : isEnd
                      ? 'border border-[#9A6E0E] bg-[#F5E6C4] font-bold text-[#5C3F04]'
                      : cell.inMonth
                        ? 'bg-white text-[#2A2015] hover:bg-[#FBF5E6]'
                        : 'bg-[#F5EFE2]/60 text-[#9B8A72] hover:bg-[#FBF5E6]'
              } ${isToday && !isInStay && !isEnd ? 'ring-1 ring-[#B8891F]' : ''}`}
            >
              <span>{cell.day}</span>
              {blockedMatch && !isInStay && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#6E5D47]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-[#3A2B18]" /> Entrada
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-[#9A6E0E]" /> Noches
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded border border-[#9A6E0E] bg-[#F5E6C4]" /> Salida
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> Otro huésped
        </span>
      </div>
    </div>
  );
};
