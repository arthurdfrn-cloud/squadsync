import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { store } from '../lib/store'
import { DAYS, HOURS, slotKey } from '../lib/config'
import AvailabilityGrid from '../components/AvailabilityGrid'
import Gate from '../components/Gate'

export default function Dashboard() {
  return (
    <Gate>
      <DashboardInner />
    </Gate>
  )
}

const ALL_SLOTS = DAYS.flatMap((d) => HOURS.map((h) => slotKey(d.key, h)))

function DashboardInner() {
  const [teams, setTeams] = useState([])
  const [playersByTeam, setPlayersByTeam] = useState({})
  const [coach, setCoach] = useState({ busySlots: [], exceptions: [], minPlayers: 3 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    const t = await store.getTeams()
    setTeams(t)
    const byTeam = {}
    for (const team of t) {
      byTeam[team.slug] = await store.getPlayers(team.slug)
    }
    setPlayersByTeam(byTeam)
    setCoach(await store.getCoachSettings())
    setLoading(false)
  }

  const freeSlots = useMemo(
    () => ALL_SLOTS.filter((k) => !coach.busySlots.includes(k)),
    [coach.busySlots]
  )

  const upcomingExceptions = useMemo(
    () =>
      [...coach.exceptions]
        .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [coach.exceptions]
  )

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-white/50">Chargement...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-white/40 hover:text-white/70">
        ← accueil
      </Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link to="/settings" className="text-sm text-white/40 hover:text-white/70">
          Réglages →
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-wide text-white/40 mb-2">Ton temps libre</h2>
        <p className="text-white/50 text-sm mb-3">
          Vert = pas de contrainte récurrente posée dans tes réglages. Grisé/hachuré = occupé.
        </p>
        <AvailabilityGrid selected={freeSlots} busy={coach.busySlots} />
        {upcomingExceptions.length > 0 && (
          <div className="mt-3 text-sm text-white/50">
            <span className="text-white/30">Exceptions à venir : </span>
            {upcomingExceptions
              .map((e) => `${new Date(e.date + 'T00:00:00').toLocaleDateString()}${e.note ? ` (${e.note})` : ''}`)
              .join(', ')}
          </div>
        )}
      </section>

      {teams.map((team) => {
        const players = playersByTeam[team.slug] ?? []
        const counts = {}
        for (const p of players) {
          for (const s of p.slots) counts[s] = (counts[s] ?? 0) + 1
        }
        const maxCount = Math.max(players.length, 1)
        const highlight = ALL_SLOTS.filter(
          (k) => (counts[k] ?? 0) >= coach.minPlayers && !coach.busySlots.includes(k)
        )
        const bestSlots = highlight
          .map((k) => ({ key: k, count: counts[k] ?? 0 }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        return (
          <section key={team.slug} className="mb-10">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="text-lg font-medium">{team.name}</h2>
              <span className="text-xs text-white/30">{players.length} joueur(s) ont répondu</span>
            </div>
            <p className="text-white/50 text-sm mb-3">
              Intensité verte = nombre de joueurs dispo. Hachuré = toi t'es occupé. Cadre orange =
              au moins {coach.minPlayers} dispo et toi libre.
            </p>
            <AvailabilityGrid counts={counts} maxCount={maxCount} busy={coach.busySlots} highlight={highlight} />
            {bestSlots.length > 0 ? (
              <p className="text-sm text-white/60 mt-3">
                Meilleurs créneaux :{' '}
                {bestSlots
                  .map(({ key, count }) => {
                    const [d, h] = key.split('-').map(Number)
                    return `${DAYS.find((x) => x.key === d).label} ${h}h (${count}/${players.length})`
                  })
                  .join(' · ')}
              </p>
            ) : (
              <p className="text-sm text-white/30 mt-3">
                Aucun créneau n'atteint le seuil de {coach.minPlayers} joueurs pour l'instant.
              </p>
            )}
            <Link to={`/team/${team.slug}`} className="text-xs text-white/30 hover:text-white/60 mt-2 inline-block">
              Voir / partager le lien de dispo de cette équipe →
            </Link>
          </section>
        )
      })}
    </div>
  )
}
