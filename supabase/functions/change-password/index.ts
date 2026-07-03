import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function friendlyMessage(raw: string): string {
  const msg = (raw || '').toLowerCase()
  if (msg.includes('known to be weak') || msg.includes('pwned') || msg.includes('breach') || msg.includes('easy to guess')) {
    return "This password is too common or has appeared in known data breaches. Please choose a stronger password — mix upper/lowercase letters, numbers, and symbols, and avoid the user's name or simple words."
  }
  if (msg.includes('should be at least') || msg.includes('password length') || msg.includes('at least 8')) {
    return 'Password is too short. Please use at least 8 characters.'
  }
  if (msg.includes('same as the old')) {
    return 'New password must be different from the previous one.'
  }
  return raw || 'Password could not be updated.'
}

// Always return 200 with { success, error } so the client receives the descriptive body
function reply(success: boolean, payload: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ success, ...payload }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return reply(false, { error: 'Missing authorization header' })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return reply(false, { error: 'Unauthorized' })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id, _role: 'admin'
    })
    const { data: isAssistant } = await supabaseClient.rpc('has_role', {
      _user_id: user.id, _role: 'assistant'
    })

    if (!isAdmin && !isAssistant) {
      return reply(false, { error: 'Only admins and assistants can change passwords' })
    }

    const { userId, newPassword } = await req.json()

    if (!userId || !newPassword) {
      return reply(false, { error: 'Missing userId or newPassword' })
    }

    if (newPassword.length < 8) {
      return reply(false, { error: 'Password must be at least 8 characters' })
    }

    if (isAssistant && !isAdmin) {
      const { data: targetRoles, error: targetRolesError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)

      if (targetRolesError) {
        return reply(false, { error: 'Error checking target user roles' })
      }

      const isTargetProtected = targetRoles?.some(
        (r: { role: string }) => r.role === 'admin' || r.role === 'production_manager'
      )

      if (isTargetProtected) {
        return reply(false, { error: 'Assistants cannot change passwords for admins or production managers' })
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('updateUserById error:', updateError.message)
      return reply(false, { error: friendlyMessage(updateError.message) })
    }

    return reply(true, { message: 'Password updated successfully' })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', errorMessage)
    return reply(false, { error: friendlyMessage(errorMessage) })
  }
})
