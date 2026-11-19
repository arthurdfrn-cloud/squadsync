import { Config } from '@remotion/cli/config'
// Utilise un Chromium déjà installé si présent (sinon Remotion télécharge le sien).
if (process.env.REMOTION_CHROME) Config.setBrowserExecutable(process.env.REMOTION_CHROME)
