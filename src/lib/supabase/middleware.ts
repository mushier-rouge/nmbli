import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requireEnv } from '@/lib/utils/env'

let loggedSupabaseEnv = false

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export async function updateSession(request: NextRequest) {
    const started = Date.now()
    console.log('[SupabaseMiddleware] start', { path: request.nextUrl.pathname, timestamp: new Date().toISOString() })
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if (!loggedSupabaseEnv) {
        const host = (() => {
            try {
                return new URL(supabaseUrl).host
            } catch {
                return 'invalid-url'
            }
        })()
        console.log(`[SupabaseMiddleware] Using Supabase host: ${host}`)
        loggedSupabaseEnv = true
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                response = NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                })
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
            },
        },
    })

    try {
        await withTimeout(supabase.auth.getUser(), 8000, 'supabase.auth.getUser (middleware)')
        console.log('[SupabaseMiddleware] completed', { path: request.nextUrl.pathname, ms: Date.now() - started })
    } catch (error) {
        console.error('[SupabaseMiddleware] auth.getUser failed', {
            path: request.nextUrl.pathname,
            error: error instanceof Error ? error.message : String(error),
        })
    }

    return response
}
