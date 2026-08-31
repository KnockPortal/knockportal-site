// Shared by the server shell and the client islands of /app. No 'use client'
// here on purpose: a module marked as client code cannot be imported by a
// Server Component, and both sides need these.

// A short sentence a person can act on, plus the raw service string kept next
// to it in small type — the technical line is what makes a support ticket
// answerable, so it is never thrown away.
export type UiError = { headline: string; detail: string | null }

export function readField(e: unknown, key: string): string | undefined {
  if (e && typeof e === 'object' && key in e) {
    const v = (e as Record<string, unknown>)[key]
    if (v !== undefined && v !== null && v !== '') return String(v)
  }
  return undefined
}

export function technicalLine(e: unknown): string {
  const parts = [
    readField(e, 'name'),
    readField(e, 'status') ? 'status ' + readField(e, 'status') : undefined,
    readField(e, 'code'),
    readField(e, 'message') ?? String(e),
  ].filter(Boolean)
  return parts.join(' · ')
}

// Supabase does not expose a stable machine code for every one of these, so we
// match on the text and status it actually returns. Anything unrecognised is
// shown verbatim rather than flattened into a vague apology.
export function describeError(e: unknown): UiError {
  const detail = technicalLine(e)
  const message = readField(e, 'message') ?? String(e)
  const lower = message.toLowerCase()
  const name = (readField(e, 'name') ?? '').toLowerCase()
  const status = Number(readField(e, 'status') ?? NaN)

  const wait = lower.match(/after (\d+) seconds?/)
  if (wait) {
    return {
      headline: `A code was already sent. You can request another in ${wait[1]} seconds.`,
      detail,
    }
  }
  if (lower.includes('email rate limit') || lower.includes('over_email_send_rate_limit')) {
    return {
      headline: 'Too many sign-in emails have gone out. Please try again later.',
      detail,
    }
  }
  if (lower.includes('api key') || lower.includes('project not specified')) {
    return {
      headline:
        'Configuration error: this site cannot reach the authentication project. Not something you can fix — please report it.',
      detail,
    }
  }
  if (
    lower.includes('token has expired') ||
    lower.includes('otp_expired') ||
    lower.includes('invalid token') ||
    lower.includes('expired or is invalid')
  ) {
    return { headline: 'That code is wrong or has expired. Request a new one.', detail }
  }
  if (
    name.includes('retryable') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed')
  ) {
    return { headline: 'Could not reach the authentication service.', detail }
  }
  if (status === 429 || lower.includes('rate limit')) {
    return { headline: 'Too many requests. Please try again in a minute.', detail }
  }
  return { headline: message, detail: null }
}

// The controls of /app are drawn by five files now — the shell and its four
// islands — and they are the same controls. The strings live in one place so a
// button cannot end up looking like a button from a different page; the values
// are the ones the single-file version used.
export const inputClass =
  'w-full rounded border border-hairline bg-slate px-3 py-2 text-sm text-hail placeholder:text-muted focus:border-orange focus:outline-none'
export const primaryClass =
  'rounded bg-orange px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40'
export const secondaryClass =
  'rounded border border-hairline px-4 py-2 text-sm text-hail hover:border-muted disabled:cursor-not-allowed disabled:opacity-40'
