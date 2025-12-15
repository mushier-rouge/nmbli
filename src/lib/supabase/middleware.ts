import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requireEnv } from '@/lib/utils/env'

let loggedSupabaseEnv = false

export async function updateSession(request: NextRequest) {
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

    await supabase.auth.getUser()

    return response
}
