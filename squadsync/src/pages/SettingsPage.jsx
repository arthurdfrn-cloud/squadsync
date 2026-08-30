import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { store } from '../lib/store'
import { DEFAULT_MIN_PLAYERS } from '../lib/config'
import AvailabilityGrid from '../components/AvailabilityGrid'
import Gate from '../components/Gate'

export default function SettingsPage() {
  return (
    <Gate>
      <SettingsInner />
    </Gate>
  )
}

function SettingsInner() {
  const [busySlots, setBusySlots] = useState([])
  const [minPlayers, setMinPlayers] = useState(DEFAULT_MIN_PLAYERS)
  const [exceptions, setExceptions] = useState([])
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [newDate, setNewDate] = useState('')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    const settings = await store.getCoachSettings()
    setBusySlots(settings.busySlots)
    setMinPlayers(settings.minPlayers)
    setExceptions(settings.exceptions)
    const t = await store.getTeams()
    setTeams(t)
    const all = await Promise.all(t.map((team) => store.getPlayers(team.slug)))
    setPlayers(all.flat())
  }

  function toggleBusy(key) {
    setBusySlots((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  async function saveBusy() {
    setSaving(true)
    try {
      await store.setCoachBusySlots(busySlots)
    } finally {
      setSaving(false)
    }
  }

  async function changeMinPlayers(n) {
    setMinPlayers(n)
    await store.setMinPlayers(n)
  }

  async function addException(e) {
    e.preventDefault()
    if (!newDate) return
    await store.addException(newDate, newNote)
    setNewDate('')
    setNewNote('')
    refresh()
  }

  async function removeException(id) {
    await store.removeException(id)
    refresh()
  }

  async function removePlayer(id) {
    if (!confirm('Retirer ce joueur du roster ?')) return
    await store.removePlayer(id)
    refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-white/40 hover:text-white/70">
        ← accueil
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Réglages</h1>

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-wide text-white/40 mb-2">
          Tes créneaux occupés récurrents
        </h2>
        <p className="text-white/50 text-sm mb-4">
          Brasserie, IFAPME, perso... tout ce qui bloque ce créneau chaque semaine. Ça sera grisé
          sur le dashboard, par-dessus les dispos des équipes.
        </p>
        <AvailabilityGrid selected={busySlots} onToggle={toggleBusy} />
        <button
          onClick={saveBusy}
          disabled={saving}
          className="mt-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-medium px-4 py-2"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </section>

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-wide text-white/40 mb-2">
          Seuil de mise en avant
        </h2>
        <p className="text-white/50 text-sm mb-3">
          Nombre minimum de joueurs dispo pour qu'un créneau soit surligné comme "bon créneau" sur
          le dashboard.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            value={minPlayers}
            onChange={(e) => changeMinPlayers(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-8 text-center font-medium">{minPlayers}</span>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-wide text-white/40 mb-2">
          Exceptions ponctuelles
        </h2>
        <p className="text-white/50 text-sm mb-3">
          Vacances, empêchement ponctuel... des jours précis où tu n'es pas dispo, en plus de tes
          créneaux récurrents.
        </p>
        <form onSubmit={addException} className="flex flex-wrap gap-2 mb-3">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Note (optionnel)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1 min-w-[140px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-emerald-500"
          />
          <button className="rounded-lg bg-white/10 hover:bg-white/15 px-4 py-2">Ajouter</button>
        </form>
        <ul className="space-y-1">
          {exceptions.map((ex) => (
            <li key={ex.id} className="flex justify-between items-center text-sm bg-white/5 rounded-lg px-3 py-2">
              <span>
                {new Date(ex.date + 'T00:00:00').toLocaleDateString()} {ex.note && `— ${ex.note}`}
              </span>
              <button onClick={() => removeException(ex.id)} className="text-white/30 hover:text-red-400">
                ✕
              </button>
            </li>
          ))}
          {exceptions.length === 0 && <p className="text-white/30 text-sm">Aucune exception pour l'instant.</p>}
        </ul>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-white/40 mb-2">Rosters</h2>
        {teams.map((team) => (
          <div key={team.slug} className="mb-4">
            <p className="text-sm font-medium mb-1">{team.name}</p>
            <ul className="space-y-1">
              {players
                .filter((p) => p.teamSlug === team.slug)
                .map((p) => (
                  <li key={p.id} className="flex justify-between items-center text-sm bg-white/5 rounded-lg px-3 py-2">
                    <span>{p.name}</span>
                    <button onClick={() => removePlayer(p.id)} className="text-white/30 hover:text-red-400">
                      retirer
                    </button>
                  </li>
                ))}
              {players.filter((p) => p.teamSlug === team.slug).length === 0 && (
                <p className="text-white/30 text-sm">Personne n'a encore rempli ses dispos.</p>
              )}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}
