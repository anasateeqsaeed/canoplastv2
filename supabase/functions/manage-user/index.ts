import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token)

    if (claimsError || !claimsData?.claims) {
      throw new Error('Unauthorized')
    }

    const callingUserId = claimsData.claims.sub as string

    const supabaseAdminForRoleCheck = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: roleData, error: roleError } = await supabaseAdminForRoleCheck
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUserId)
      .in('role', ['admin', 'assistant'])

    if (roleError || !roleData || roleData.length === 0) {
      throw new Error('Only admins and assistants can manage users')
    }

    const isAdmin = roleData.some(r => r.role === 'admin')
    const isAssistant = roleData.some(r => r.role === 'assistant') && !isAdmin

    const { action, ...params } = await req.json()

    if (isAssistant) {
      // Assistants can ONLY create users, and only with the data_entry role.
      if (action !== 'create') {
        throw new Error('Assistants can only create users')
      }

      const { roles } = params
      if (roles && Array.isArray(roles)) {
        const invalidRoles = roles.filter((r: string) => r !== 'data_entry')
        if (invalidRoles.length > 0) {
          throw new Error('Assistants can only create data entry users')
        }
      }

      if (!roles || roles.length === 0) {
        params.roles = ['data_entry']
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let result: Record<string, unknown> = {}

    switch (action) {
      case 'create': {
        const { username, password, fullName, roles } = params

        if (!username || !password) {
          throw new Error('Username and password are required')
        }

        const sanitizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '')

        if (sanitizedUsername.length < 3) {
          throw new Error('Username must be at least 3 valid characters (letters, numbers, underscores, hyphens)')
        }

        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters')
        }

        const email = `${sanitizedUsername}@canoplast.local`

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName || username }
        })

        if (createError) {
          throw createError
        }

        if (!newUser.user) {
          throw new Error('Failed to create user')
        }

        if (roles && Array.isArray(roles) && roles.length > 0) {
          for (const role of roles) {
            const { error: roleInsertError } = await supabaseAdmin
              .from('user_roles')
              .insert({ user_id: newUser.user.id, role })

            if (roleInsertError) {
              console.error('Error assigning role:', roleInsertError)
            }
          }
        }

        result = {
          success: true,
          message: 'User created successfully',
          userId: newUser.user.id
        }
        break
      }

      case 'update': {
        if (isAssistant) {
          throw new Error('Assistants cannot update users')
        }

        const { userId, fullName, isActive } = params

        if (!userId) {
          throw new Error('User ID is required')
        }

        const updateData: Record<string, unknown> = {}
        if (fullName !== undefined) updateData.full_name = fullName
        if (isActive !== undefined) updateData.is_active = isActive

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('user_id', userId)

          if (updateError) {
            throw updateError
          }
        }

        result = { success: true, message: 'User updated successfully' }
        break
      }

      case 'toggle_active': {
        if (isAssistant) {
          throw new Error('Assistants cannot toggle user status')
        }

        const { userId, isActive } = params

        if (!userId) {
          throw new Error('User ID is required')
        }

        if (typeof isActive !== 'boolean') {
          throw new Error('isActive must be a boolean')
        }

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_active: isActive })
          .eq('user_id', userId)

        if (updateError) {
          throw updateError
        }

        result = {
          success: true,
          message: isActive ? 'User enabled successfully' : 'User disabled successfully'
        }
        break
      }

      case 'delete': {
        if (isAssistant) {
          throw new Error('Assistants cannot delete users')
        }

        const { userId } = params

        if (!userId) {
          throw new Error('User ID is required')
        }

        if (userId === callingUserId) {
          throw new Error('You cannot delete your own account')
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
          throw deleteError
        }

        result = { success: true, message: 'User deleted successfully' }
        break
      }

      case 'copy': {
        if (isAssistant) {
          throw new Error('Assistants cannot copy users')
        }

        const { sourceUserId, username, password, fullName, copyOverrides } = params

        if (!sourceUserId) {
          throw new Error('Source user ID is required')
        }
        if (!username || !password) {
          throw new Error('Username and password are required')
        }

        const sanitizedUsername = String(username).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '')
        if (sanitizedUsername.length < 3) {
          throw new Error('Username must be at least 3 valid characters (letters, numbers, underscores, hyphens)')
        }
        if (String(password).length < 8) {
          throw new Error('Password must be at least 8 characters')
        }

        const { data: srcRoles, error: srcRolesErr } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', sourceUserId)
        if (srcRolesErr) throw srcRolesErr

        const rolesToCopy: string[] = (srcRoles || []).map((r: { role: string }) => r.role)

        let overridesToCopy: Array<Record<string, unknown>> = []
        if (copyOverrides) {
          const { data: srcOverrides, error: srcOvErr } = await supabaseAdmin
            .from('user_permission_overrides')
            .select('module, can_view, can_create, can_edit, can_delete')
            .eq('user_id', sourceUserId)
          if (srcOvErr) throw srcOvErr
          overridesToCopy = srcOverrides || []
        }

        const email = `${sanitizedUsername}@canoplast.local`
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName || sanitizedUsername }
        })
        if (createError) throw createError
        if (!newUser.user) throw new Error('Failed to create user')

        const newUserId = newUser.user.id

        if (rolesToCopy.length > 0) {
          const rolesPayload = rolesToCopy.map((role) => ({ user_id: newUserId, role }))
          const { error: rolesInsertErr } = await supabaseAdmin
            .from('user_roles')
            .insert(rolesPayload)
          if (rolesInsertErr) {
            console.error('Error copying roles:', rolesInsertErr)
          }
        }

        let copiedOverridesCount = 0
        if (copyOverrides && overridesToCopy.length > 0) {
          const overridesPayload = overridesToCopy.map((o) => ({
            user_id: newUserId,
            module: o.module,
            can_view: o.can_view,
            can_create: o.can_create,
            can_edit: o.can_edit,
            can_delete: o.can_delete,
          }))
          const { error: ovInsertErr } = await supabaseAdmin
            .from('user_permission_overrides')
            .insert(overridesPayload)
          if (ovInsertErr) {
            console.error('Error copying overrides:', ovInsertErr)
          } else {
            copiedOverridesCount = overridesPayload.length
          }
        }

        try {
          await supabaseAdmin.rpc('log_role_activity', {
            p_action: 'user_copied',
            p_actor_id: callingUserId,
            p_target_user_id: newUserId,
            p_role: null,
            p_details: {
              source_user_id: sourceUserId,
              copied_roles: rolesToCopy,
              copied_override_modules: overridesToCopy.map((o) => o.module),
            },
          })
        } catch (logErr) {
          console.error('Activity log failed:', logErr)
        }

        result = {
          success: true,
          message: 'User copied successfully',
          userId: newUserId,
          copiedRoles: rolesToCopy,
          copiedOverrides: copiedOverridesCount,
        }
        break
      }

      // NOTE: v1's 'create_operator_with_user' action is deferred — it depends on the
      // `operators` table, which lands in Phase 5 (Production) alongside operator accounts.

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
