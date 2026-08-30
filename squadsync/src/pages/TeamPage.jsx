import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { store } from '../lib/store'
import AvailabilityGrid from '../components/AvailabilityGrid'

export default function TeamPage() {
  const { slug } = useParams()
  const [teamName, setTeamName] = useState(slug)
  const [players, setPlayers] = useState([])
  const [name, setName] = useState('')
  const [slots, setSlots] = useState([])
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    refresh()
  }, [slug])

  async function refresh() {
    const teams = await store.getTeams()
    const team = teams.find((t) => t.slug === slug)
    setTeamName(team?.name ?? slug)
    setPlayers(await store.getPlayers(slug))
  }

  const existingPlayer = useMemo(
    () => players.find((p) => p.name.toLowerCase() === name.trim().toLowerCase()),
    [players, name]
  )

  useEffect(() => {
    setSlots(existingPlayer?.slots ?? [])
  }, [existingPlayer?.id])

  function toggle(key) {
    setSlots((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await store.upsertPlayerAvailability(slug, name.trim(), slots)
      setSaved(new Date())
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-white/40 hover:text-white/70">
        ← accueil
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">{teamName}</h1>
      <p className="text-white/50 text-sm mb-6">
        Coche tes créneaux dispo pour les sessions / VOD review. Tu ne reviens ici que le jour où
        ça change — pas besoin de la refaire chaque semaine.
      </p>

      <label className="block text-sm text-white/60 mb-1">Ton pseudo</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        list="players-list"
        placeholder="Ton pseudo dans l'équipe"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 mb-4 outline-none focus:border-emerald-500"
      />
      <datalist id="players-list">
        {players.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      <div className={name.trim() ? '' : 'opacity-40 pointer-events-none'}>
        <AvailabilityGrid selected={slots} onToggle={toggle} />
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={save}
          disabled={!name.trim() || saving}
          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-medium px-4 py-2 transition-colors"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer mes dispos'}
        </button>
        {saved && <span className="text-xs text-white/40">Enregistré à {saved.toLocaleTimeString()}</span>}
      </div>

      {existingPlayer && (
        <p className="text-xs text-white/30 mt-2">
          Dernière mise à jour : {new Date(existingPlayer.updatedAt).toLocaleString()}
        </p>
      )}

      <div className="mt-10">
        <p className="text-xs uppercase tracking-wide text-white/30 mb-2">Roster ({players.length})</p>
        <ul className="text-sm text-white/50 space-y-1">
          {players.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.name}</span>
              <span className="text-white/30">{p.slots.length} créneaux</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
