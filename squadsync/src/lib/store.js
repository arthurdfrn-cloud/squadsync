import { isSupabaseConfigured } from './supabaseClient'
import { localStore } from './localStore'
import { supabaseStore } from './supabaseStore'

// Bascule automatique : si les variables d'env Supabase sont présentes,
// on utilise le vrai backend partagé. Sinon, mode local (démo/solo).
export const store = isSupabaseConfigured ? supabaseStore : localStore
