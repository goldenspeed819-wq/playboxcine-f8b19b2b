import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get client IP from headers
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'check') {
      // Check if IP is blocked
      const now = new Date().toISOString()
      
      const { data: blockedIP } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('ip_address', clientIP)
        .gt('expires_at', now)
        .single()

      if (blockedIP) {
        console.log(`IP ${clientIP} is blocked until ${blockedIP.expires_at}`)
        return new Response(
          JSON.stringify({ 
            blocked: true, 
            expires_at: blockedIP.expires_at,
            message: 'Acesso temporariamente bloqueado por atividade suspeita.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'block') {
      // Block the IP for 24 hours
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      // Check if already blocked
      const { data: existing } = await supabase
        .from('blocked_ips')
        .select('id')
        .eq('ip_address', clientIP)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!existing) {
        const { error } = await supabase
          .from('blocked_ips')
          .insert({
            ip_address: clientIP,
            expires_at: expiresAt.toISOString(),
            reason: 'dev_tools_attempt'
          })

        if (error) {
          console.error('Error blocking IP:', error)
        } else {
          console.log(`IP ${clientIP} blocked until ${expiresAt.toISOString()}`)
        }
      }

      return new Response(
        JSON.stringify({ blocked: true, expires_at: expiresAt.toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
