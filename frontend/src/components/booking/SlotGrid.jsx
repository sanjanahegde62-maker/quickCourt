import { money, timeRange } from '../../utils/format'

/** Shows every slot the backend returned. Unavailable slots are visible but disabled. */
export default function SlotGrid({ slots, selectedId, onSelect }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Time slots">
      {slots.map((s) => {
        const selected = s.slotId === selectedId
        return (
          <li key={s.slotId ?? `${s.startTime}-${s.endTime}`}>
            <button
              type="button"
              disabled={!s.available}
              aria-pressed={selected}
              onClick={() => onSelect(s)}
              className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-court ${
                selected ? 'border-court bg-court text-white'
                  : s.available ? 'border-slate-300 bg-white text-navy hover:border-court hover:bg-mint'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
              }`}
            >
              <span className="block font-semibold">{timeRange(s.startTime, s.endTime)}</span>
              <span className="block text-xs">{s.available ? money(s.price) : 'Unavailable'}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
