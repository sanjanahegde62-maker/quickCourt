import { describe, expect, it } from 'vitest'
import { normalizeError } from '../services/api/client'
import { bucketOf, isCancellable, normalizeRole, toPage, toSlot } from '../services/adapters'

const httpErr = (status, data) => ({ response: { status, data } })

describe('normalizeError', () => {
  it('maps a network failure', () => {
    expect(normalizeError({ message: 'x' })).toMatchObject({ status: 0 })
  })
  it('keeps 409 and 403 distinct from 401', () => {
    expect(normalizeError(httpErr(409, {})).status).toBe(409)
    expect(normalizeError(httpErr(403, {})).message).toMatch(/permission/i)
    expect(normalizeError(httpErr(401, {})).message).toMatch(/session/i)
  })
  it('never shows raw server text for 5xx', () => {
    const e = normalizeError(httpErr(500, { message: 'java.lang.NullPointerException at ...' }))
    expect(e.message).not.toMatch(/NullPointer/)
  })
  it('uses validation messages for 400 and extracts field errors', () => {
    const e = normalizeError(httpErr(400, { message: 'Invalid', errors: [{ field: 'email', message: 'bad email' }] }))
    expect(e.message).toBe('Invalid')
    expect(e.fieldErrors).toEqual({ email: 'bad email' })
  })
  it('flags cancelled requests', () => {
    expect(normalizeError({ code: 'ERR_CANCELED' }).cancelled).toBe(true)
  })
})

describe('adapters', () => {
  it('handles Spring pages and plain arrays', () => {
    expect(toPage({ content: [1, 2], totalPages: 3, number: 1 })).toMatchObject({ items: [1, 2], totalPages: 3, page: 1 })
    expect(toPage([1]).items).toEqual([1])
  })
  it('normalizes roles without trusting the client', () => {
    expect(normalizeRole('ROLE_ADMIN')).toBe('admin')
    expect(normalizeRole(['OWNER'])).toBe('owner')
    expect(normalizeRole('USER')).toBe('player')
    expect(normalizeRole('HACKER')).toBeNull()
  })
  it('marks slot availability from the server status', () => {
    expect(toSlot({ slotId: 1, status: 'AVAILABLE' }).available).toBe(true)
    expect(toSlot({ slotId: 2, status: 'BOOKED' }).available).toBe(false)
  })
  it('buckets bookings and gates cancellation by status', () => {
    expect(bucketOf({ status: 'CANCELLED' })).toBe('cancelled')
    expect(bucketOf({ status: 'CONFIRMED' })).toBe('upcoming')
    expect(isCancellable({ status: 'COMPLETED' })).toBe(false)
  })
})
