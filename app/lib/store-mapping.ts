// Local validation of an explicitly supplied ownership snapshot.
// This module neither reads the database nor proves current server-side ownership.
export type AcceptedStoreMapping = {
  ownerId: string
  storeId: string
  connectionId: string
  provider: string
  externalStoreId: string
}
export type MappingIssue = {
  source: 'input' | 'stores' | 'connections' | 'mappings'
  index: number
  code: 'invalid_input' | 'invalid_record' | 'duplicate_id' | 'missing_reference' | 'ambiguous_reference' | 'owner_mismatch' | 'duplicate_external_id'
}
export type MappingValidation = { accepted: AcceptedStoreMapping[]; issues: MappingIssue[] }
type Store = { id: string; ownerId: string }
type Connection = Store & { provider: string }
type RecordValue = Record<string, unknown>
const isRecord = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value)
// IDs are opaque and case-sensitive. Do not infer UUID types or normalize them.
const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value)
const tuple = (...values: string[]) => JSON.stringify(values)

export function validateStoreMappings(input: unknown): MappingValidation {
  const accepted: AcceptedStoreMapping[] = []
  const issues: MappingIssue[] = []
  if (!isRecord(input) || !isId(input.ownerId) || !Array.isArray(input.stores) || !Array.isArray(input.connections) || !Array.isArray(input.mappings)) {
    return { accepted, issues: [{ source: 'input', index: -1, code: 'invalid_input' }] }
  }
  const ownerId = input.ownerId
  function indexRows<T extends Store>(source: 'stores' | 'connections', rows: unknown[], parse: (row: RecordValue, id: string) => T | null): Map<string, T[]> {
    const index = new Map<string, T[]>()
    const counts = new Map<string, number>()
    rows.forEach((row: unknown, position: number) => {
      if (!isRecord(row) || !isId(row.id)) {
        issues.push({ source, index: position, code: 'invalid_record' })
        return
      }
      const count = (counts.get(row.id) || 0) + 1
      counts.set(row.id, count)
      if (count > 1) issues.push({ source, index: position, code: 'duplicate_id' })
      const entry = parse(row, row.id)
      if (!entry) {
        issues.push({ source, index: position, code: 'invalid_record' })
        return
      }
      index.set(row.id, [...(index.get(row.id) || []), entry])
    })
    // Even a malformed duplicate must quarantine every reference to that ID.
    for (const [id, count] of counts) if (count > 1) index.set(id, [])
    return index
  }
  const stores = indexRows('stores', input.stores, (row, id) => isId(row.ownerId) ? { id, ownerId: row.ownerId } : null)
  const connections = indexRows('connections', input.connections, (row, id) => isId(row.ownerId) && isId(row.provider) ? { id, ownerId: row.ownerId, provider: row.provider } : null)
  const candidates: { mapping: AcceptedStoreMapping; position: number }[] = []
  const externalCounts = new Map<string, number>()
  input.mappings.forEach((row: unknown, position: number) => {
    // A bad target store must not hide a duplicate declaration of the same external ID.
    if (isRecord(row) && isId(row.connectionId) && isId(row.externalStoreId)) {
      const owners = connections.get(row.connectionId)
      if (owners?.length === 1 && owners[0].ownerId === ownerId) {
        const key = tuple(owners[0].provider, row.externalStoreId)
        externalCounts.set(key, (externalCounts.get(key) || 0) + 1)
      }
    }
    if (!isRecord(row) || !isId(row.storeId) || !isId(row.connectionId) || !isId(row.externalStoreId)) {
      issues.push({ source: 'mappings', index: position, code: 'invalid_record' })
      return
    }
    const storeRows = stores.get(row.storeId)
    const connectionRows = connections.get(row.connectionId)
    if (!storeRows || !connectionRows) {
      issues.push({ source: 'mappings', index: position, code: 'missing_reference' })
      return
    }
    if (storeRows.length !== 1 || connectionRows.length !== 1) {
      issues.push({ source: 'mappings', index: position, code: 'ambiguous_reference' })
      return
    }
    if (storeRows[0].ownerId !== ownerId || connectionRows[0].ownerId !== ownerId) {
      issues.push({ source: 'mappings', index: position, code: 'owner_mismatch' })
      return
    }
    candidates.push({ position, mapping: { ownerId, storeId: row.storeId, connectionId: row.connectionId, provider: connectionRows[0].provider, externalStoreId: row.externalStoreId } })
  })
  for (const { mapping, position } of candidates) {
    if (externalCounts.get(tuple(mapping.provider, mapping.externalStoreId)) !== 1) {
      issues.push({ source: 'mappings', index: position, code: 'duplicate_external_id' })
    } else accepted.push(mapping)
  }
  return { accepted, issues }
}

export type ExternalMappingRecord = { ownerId: string; connectionId?: string | null; provider?: string | null; externalStoreId?: string | null }
export type RecordMapping = { status: 'mapped'; storeId: string } | { status: 'unmapped' } | { status: 'excluded' }

// Callers must not put excluded records into an account's unmapped bucket.
// Supply trusted validation output, not client-supplied accepted mappings.
// Server-side ownership and authorization must be checked again before real access.
export function resolveRecordMapping(record: ExternalMappingRecord, ownerId: string, mappings: readonly AcceptedStoreMapping[]): RecordMapping {
  if (!isId(ownerId) || !record || record.ownerId !== ownerId) return { status: 'excluded' }
  if (!isId(record.connectionId) || !isId(record.provider) || !isId(record.externalStoreId)) return { status: 'unmapped' }
  const matches = mappings.filter(mapping => mapping.ownerId === ownerId && mapping.connectionId === record.connectionId && mapping.provider === record.provider && mapping.externalStoreId === record.externalStoreId && isId(mapping.storeId))
  return matches.length === 1 ? { status: 'mapped', storeId: matches[0].storeId } : { status: 'unmapped' }
}

export type MappingRequestScope = { ownerId: string; scope: 'account' | 'store'; storeId?: string; provider?: string }
// Transport identity only; this key does not authorize access to a store.
export function buildMappingRequestKey(input: MappingRequestScope): string | null {
  if (!input || !isId(input.ownerId) || (input.provider !== undefined && !isId(input.provider))) return null
  if (input.scope === 'account' && input.storeId === undefined) return tuple(input.ownerId, 'account', '', input.provider || '')
  if (input.scope === 'store' && isId(input.storeId)) return tuple(input.ownerId, 'store', input.storeId, input.provider || '')
  return null
}

export function isMappingResponseCurrent(response: { key: string; generation: number }, current: { key: string; generation: number }): boolean {
  return Boolean(response && current && isId(response.key) && response.key === current.key && Number.isSafeInteger(response.generation) && response.generation >= 0 && response.generation === current.generation)
}

// The denominator must contain observed, applicable checks, never unknown ones.
// This is not an external platform score or an estimate of search performance.
export function calculateObservedPassRate(passed: number, observed: number): number | null {
  if (!Number.isSafeInteger(passed) || !Number.isSafeInteger(observed) || passed < 0 || observed <= 0 || passed > observed) return null
  return Math.round((passed / observed) * 10000) / 100
}
