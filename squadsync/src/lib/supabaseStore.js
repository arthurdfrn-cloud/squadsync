// Implémentation Supabase : partagée entre tous les appareils (les joueurs
// remplissent depuis leur tel, toi tu vois tout depuis le dashboard).
// Nécessite d'avoir exécuté supabase/schema.sql et rempli les variables
// d'env VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (voir README).

import { supabase } from './supabaseClient'
import { DEFAULT_MIN_PLAYERS } from './config'

let teamCache = null

async function getTeamIdBySlug(slug) {
  if (!teamCache) {
    const { data, error } = await supabase.from('teams').select('id, slug')
    if (error) throw error
    teamCache = data
  }
  const team = teamCache.find((t) => t.slug === slug)
  if (!team) throw new Error(`Équipe inconnue: ${slug}`)
  return team.id
}

export const supabaseStore = {
  backend: 'supabase',

  async getTeams() {
    const { data, error } = await supabase.from('teams').select('slug, name').order('name')
    if (error) throw error
    teamCache = data.map((t, i) => ({ ...t, id: data[i].id }))
    return data
  },

  async getPlayers(teamSlug) {
    const teamId = await getTeamIdBySlug(teamSlug)
    const { data, error } = await supabase
      .from('players')
      .select('id, name, slots, updated_at')
      .eq('team_id', teamId)
      .order('name')
    if (error) throw error
    return data.map((p) => ({ ...p, teamSlug, updatedAt: p.updated_at }))
  },

  async getAllPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, slots, updated_at, teams(slug)')
    if (error) throw error
    return data.map((p) => ({
      ...p,
      teamSlug: p.teams?.slug,
      updatedAt: p.updated_at,
    }))
  },

  async upsertPlayerAvailability(teamSlug, playerName, slots) {
    const teamId = await getTeamIdBySlug(teamSlug)
    const name = playerName.trim()
    const { data, error } = await supabase
      .from('players')
      .upsert(
        { team_id: teamId, name, slots, updated_at: new Date().toISOString() },
        { onConflict: 'team_id,name' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },

  async removePlayer(playerId) {
    const { error } = await supabase.from('players').delete().eq('id', playerId)
    if (error) throw error
  },

  async getCoachSettings() {
    const [{ data: settings, error: e1 }, { data: exceptions, error: e2 }] = await Promise.all([
      supabase.from('coach_settings').select('busy_slots, min_players').eq('id', 1).maybeSingle(),
      supabase.from('coach_exceptions').select('id, date, note').order('date'),
    ])
    if (e1) throw e1
    if (e2) throw e2
    return {
      busySlots: settings?.busy_slots ?? [],
      minPlayers: settings?.min_players ?? DEFAULT_MIN_PLAYERS,
      exceptions: exceptions ?? [],
    }
  },

  async setCoachBusySlots(slots) {
    const { error } = await supabase
      .from('coach_settings')
      .upsert({ id: 1, busy_slots: slots }, { onConflict: 'id' })
    if (error) throw error
  },

  async setMinPlayers(n) {
    const { error } = await supabase
      .from('coach_settings')
      .upsert({ id: 1, min_players: n }, { onConflict: 'id' })
    if (error) throw error
  },

  async addException(date, note) {
    const { error } = await supabase.from('coach_exceptions').insert({ date, note })
    if (error) throw error
  },

  async removeException(id) {
    const { error } = await supabase.from('coach_exceptions').delete().eq('id', id)
    if (error) throw error
  },
}
