import { DAYS, HOURS, slotKey } from '../lib/config'

/**
 * Grille hebdo réutilisable.
 *
 * Modes:
 * - editable (onToggle fourni) : clic = ajoute/retire un créneau de `selected`
 * - heatmap (`counts` fourni)  : couleur = intensité proportionnelle au nombre de joueurs dispo
 * - overlay (`busy` fourni)    : hachure les créneaux où le coach est occupé
 * - `highlight` : liste de clés à faire ressortir (meilleurs créneaux)
 */
export default function AvailabilityGrid({
  selected = [],
  onToggle,
  counts,
  maxCount = 1,
  busy = [],
  highlight = [],
  compact = false,
}) {
  const selectedSet = new Set(selected)
  const busySet = new Set(busy)
  const highlightSet = new Set(highlight)

  function cellClasses(key, count) {
    const base = [
      'relative border border-white/5 rounded-md transition-colors select-none',
      compact ? 'h-7' : 'h-10 sm:h-12',
      onToggle ? 'cursor-pointer active:scale-95' : '',
    ]

    if (busySet.has(key)) {
      base.push('bg-[repeating-linear-gradient(45deg,#1c1f27,#1c1f27_4px,#14161b_4px,#14161b_8px)]')
      return base.join(' ')
    }

    if (typeof count === 'number') {
      if (count === 0) {
        base.push('bg-white/5')
      } else {
        const intensity = Math.min(count / Math.max(maxCount, 1), 1)
        base.push(intensityBg(intensity))
      }
    } else if (selectedSet.has(key)) {
      base.push('bg-emerald-500')
    } else {
      base.push('bg-white/5 hover:bg-white/10')
    }

    if (highlightSet.has(key)) {
      base.push('ring-2 ring-amber-400')
    }

    return base.join(' ')
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[280px]">
        <div className="grid grid-cols-[24px_repeat(7,1fr)] gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
          <div />
          {DAYS.map((d) => (
            <div key={d.key} className="text-center text-[11px] sm:text-xs font-medium text-white/60">
              {d.label}
            </div>
          ))}
        </div>
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[24px_repeat(7,1fr)] gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
            <div className="text-[10px] sm:text-[11px] text-white/40 flex items-center justify-end pr-1">
              {hour}h
            </div>
            {DAYS.map((d) => {
              const key = slotKey(d.key, hour)
              const count = counts ? counts[key] ?? 0 : undefined
              return (
                <button
                  type="button"
                  key={key}
                  disabled={!onToggle}
                  onClick={() => onToggle && onToggle(key)}
                  className={cellClasses(key, count)}
                  title={typeof count === 'number' ? `${count} dispo` : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function intensityBg(intensity) {
  // Dégradé vert : plus il y a de joueurs dispo, plus c'est saturé.
  if (intensity >= 0.99) return 'bg-emerald-400'
  if (intensity >= 0.75) return 'bg-emerald-500/80'
  if (intensity >= 0.5) return 'bg-emerald-600/60'
  if (intensity >= 0.25) return 'bg-emerald-700/40'
  return 'bg-emerald-800/25'
}
