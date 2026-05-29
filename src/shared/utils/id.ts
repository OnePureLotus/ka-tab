import { nanoid as _nanoid } from 'nanoid'

/** Generate a URL-safe unique ID (21 chars by default) */
export const generateId = (): string => _nanoid()
