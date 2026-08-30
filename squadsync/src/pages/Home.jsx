import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { store } from '../lib/store'

export default function Home() {
  const [teams, setTeams] = useState([])

  useEffect(() => {
    store.getTeams().then(setTeams)
  }, [])

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-2">SquadSync</h1>
      <p className="text-white/50 mb-10">Dispos d'équipes + ton temps libre, au même endroit.</p>

      <div className="space-y-3 mb-10">
        {teams.map((t) => (
          <Link
            key={t.slug}
            to={`/team/${t.slug}`}
            className="block rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 transition-colors"
          >
            Remplir mes dispos — <span className="font-medium">{t.name}</span>
          </Link>
        ))}
      </div>

      <div className="flex justify-center gap-4 text-sm">
        <Link to="/dashboard" className="text-white/50 hover:text-white/80">
          Dashboard coach →
        </Link>
        <Link to="/settings" className="text-white/50 hover:text-white/80">
          Réglages →
        </Link>
      </div>

      {store.backend === 'local' && (
        <p className="mt-12 text-xs text-amber-400/70">
          Mode démo local — rien n'est partagé entre appareils. Configure Supabase (voir README)
          pour que tes joueurs puissent remplir depuis leur tel.
        </p>
      )}
    </div>
  )
}
