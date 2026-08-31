import type { SupabaseClient } from '@supabase/supabase-js'
import { technicalLine } from '@/lib/ui-error'

// Shape confirmed against pg_proc on 2026-08-30:
// ensure_workspace(p_source_demo_slug text)
//   RETURNS TABLE(workspace_id uuid, member_role text, is_new boolean)
// RETURNS TABLE means PostgREST hands back an array, not an object.
export type EnsureWorkspaceRow = {
  workspace_id: string
  member_role: string
  is_new: boolean
}

// A tagged union rather than a nullable row: the two ways this can fail need
// different words from the caller — one names a service failure, the other says
// the lookup came back empty — and a bare null would make every caller guess
// which one it got.
export type EnsureWorkspaceResult =
  | { ok: true; workspace: EnsureWorkspaceRow }
  | { ok: false; reason: 'rpc_failed' | 'no_rows'; detail: string }

/**
 * The one place that calls ensure_workspace. Server only: every caller holds a
 * session client built from the request cookies.
 *
 * Idempotent by design — repeated calls return the existing workspace and do
 * not overwrite the first-touch acquisition slug, so retrying is safe.
 *
 * It neither logs nor builds an HTTP response. A page turns the failure into a
 * section on screen and a route turns it into a status code, and neither shape
 * belongs to the lookup itself.
 */
export async function ensureWorkspace(
  supabase: SupabaseClient,
  sourceDemoSlug: string | null,
): Promise<EnsureWorkspaceResult> {
  const { data: rows, error } = await supabase.rpc('ensure_workspace', {
    p_source_demo_slug: sourceDemoSlug,
  })

  if (error) {
    return { ok: false, reason: 'rpc_failed', detail: technicalLine(error) }
  }

  const list = (rows ?? []) as EnsureWorkspaceRow[]
  if (list.length === 0) {
    return { ok: false, reason: 'no_rows', detail: 'ensure_workspace returned no rows' }
  }

  return { ok: true, workspace: list[0] }
}
