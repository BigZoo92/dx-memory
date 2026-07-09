import raw from './structure-snapshot.json'
import type { StructureSnapshot } from './types'

/** Photographie structurelle des dépendances internes réelles — hors CTL. */
export const structure = raw as unknown as StructureSnapshot
