import { useState } from 'react'

// Petit verrou côté client (PIN dans une variable d'env) pour éviter que
// n'importe qui tombant sur le lien /settings ou /dashboard bidouille tes
// réglages. Ce n'est PAS une vraie sécurité (le code est visible côté
// client) — juste un frein pour un lien partagé par erreur.
const PIN = import.meta.env.VITE_COACH_PIN

export default function Gate({ children }) {
  const [unlocked, setUnlocked] = useState(!PIN || sessionStorage.getItem('squadsync_unlocked') === '1')
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return children

  function submit(e) {
    e.preventDefault()
    if (input === PIN) {
      sessionStorage.setItem('squadsync_unlocked', '1')
      setUnlocked(true)
    } else {
      setError(true)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-24 text-center">
      <p className="text-white/60 mb-4">Code d'accès</p>
      <form onSubmit={submit}>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError(false)
          }}
          className="w-full text-center rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-emerald-500"
        />
        {error && <p className="text-red-400 text-xs mt-2">Code incorrect</p>}
        <button className="mt-4 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-4 py-2">
          Entrer
        </button>
      </form>
    </div>
  )
}
