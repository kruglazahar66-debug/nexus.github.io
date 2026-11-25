import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://kruglazahar66-debug.github.io',
  'http://localhost:8000',
]);

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!token || !url || !anonKey || !serviceRoleKey) {
    return Response.json({ error: 'Unauthorized or server is not configured' }, { status: 401, headers: corsHeaders });
  }

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

  const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await adminClient
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profileError || profile?.role !== 'admin') {
    return Response.json({ error: 'Administrator access required' }, { status: 403, headers: corsHeaders });
  }

  let body: { action?: string; userId?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders });
  }

  if (body.action === 'list') {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return Response.json({ error: 'Could not load users' }, { status: 500, headers: corsHeaders });
    const users = data.users.map((entry) => ({
      id: entry.id,
      email: entry.email ?? '',
      createdAt: entry.created_at,
    }));
    return Response.json({ users }, { headers: corsHeaders });
  }

  if (body.action === 'delete' && typeof body.userId === 'string') {
    if (body.userId === user.id) {
      return Response.json({ error: 'You cannot delete your own administrator account here' }, { status: 400, headers: corsHeaders });
    }
    const { error } = await adminClient.auth.admin.deleteUser(body.userId);
    if (error) return Response.json({ error: 'Could not delete user' }, { status: 500, headers: corsHeaders });
    return Response.json({ success: true }, { headers: corsHeaders });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400, headers: corsHeaders });
});
