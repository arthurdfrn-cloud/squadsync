// Config centrale : jours, tranches horaires, équipes par défaut.
// Modifie ici si tu veux changer les horaires couverts par la grille.

export const DAYS = [
  { key: 0, label: 'Lun' },
  { key: 1, label: 'Mar' },
  { key: 2, label: 'Mer' },
  { key: 3, label: 'Jeu' },
  { key: 4, label: 'Ven' },
  { key: 5, label: 'Sam' },
  { key: 6, label: 'Dim' },
]

// Tranches horaires couvertes par la grille (heure de début, 1h de large chacune).
// Par défaut : soirée gaming, 17h -> 23h.
export const HOURS = [17, 18, 19, 20, 21, 22]

export function slotKey(day, hour) {
  return `${day}-${hour}`
}

// Équipes par défaut si la base est vide (seed initial).
export const DEFAULT_TEAMS = [
  { slug: 'pax', name: 'Pax Horizon' },
  { slug: 'pepsonnet', name: 'Pepsonnet' },
]

// Nombre minimum de joueurs dispo pour qu'un créneau soit mis en avant sur le dashboard.
export const DEFAULT_MIN_PLAYERS = 3
