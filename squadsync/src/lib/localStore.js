// Implémentation de secours basée sur localStorage.
// Sert de mode démo/solo (tout reste sur cet appareil, rien n'est partagé).
// Utile pour tester l'appli avant d'avoir branché Supabase, ou si tu veux
// juste garder tes propres réglages en local.

import { DEFAULT_TEAMS, DEFAULT_MIN_PLAYERS } from './config'

const KEY = 'squadsync_v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('localStore: lecture impossible', e)
  }
  return {
    teams: DEFAULT_TEAMS,
    players: [], // { id, teamSlug, name, slots: [], updatedAt }
    coach: { busySlots: [], exceptions: [], minPlayers: DEFAULT_MIN_PLAYERS },
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export const localStore = {
  backend: 'local',

  async getTeams() {
    return load().teams
  },

  async getPlayers(teamSlug) {
    return load().players.filter((p) => p.teamSlug === teamSlug)
  },

  async getAllPlayers() {
    return load().players
  },

  async upsertPlayerAvailability(teamSlug, playerName, slots) {
    const state = load()
    const name = playerName.trim()
    let player = state.players.find(
      (p) => p.teamSlug === teamSlug && p.name.toLowerCase() === name.toLowerCase()
    )
    if (player) {
      player.slots = slots
      player.updatedAt = new Date().toISOString()
    } else {
      player = { id: uid(), teamSlug, name, slots, updatedAt: new Date().toISOString() }
      state.players.push(player)
    }
    save(state)
    return player
  },

  async removePlayer(playerId) {
    const state = load()
    state.players = state.players.filter((p) => p.id !== playerId)
    save(state)
  },

  async getCoachSettings() {
    return load().coach
  },

  async setCoachBusySlots(slots) {
    const state = load()
    state.coach.busySlots = slots
    save(state)
  },

  async setMinPlayers(n) {
    const state = load()
    state.coach.minPlayers = n
    save(state)
  },

  async addException(date, note) {
    const state = load()
    state.coach.exceptions.push({ id: uid(), date, note })
    save(state)
  },

  async removeException(id) {
    const state = load()
    state.coach.exceptions = state.coach.exceptions.filter((e) => e.id !== id)
    save(state)
  },
}
