const SPOTIFY_TOKEN_URL  = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API        = 'https://api.spotify.com/v1';
const PLAYLIST_NAME      = "recently played · lorie's corner";

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';

    const allowedOrigin =
      origin.includes('loriechen.com') || origin.includes('.pages.dev')
        ? origin
        : 'https://loriechen.com';

    const cors = {
      'Access-Control-Allow-Origin':  allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age':       '86400',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    switch (url.pathname) {
      case '/auth':     return handleAuth(env);
      case '/callback': return handleCallback(url, env);
      case '/playlist': return handlePlaylist(env, cors);
      case '/debug':    return handleDebug(env, cors); // remove before shipping
      default:          return new Response('Not found', { status: 404 });
    }
  },
};

// ── Step 1: redirect to Spotify authorization ──────────────────────────────
function handleAuth(env) {
  const params = new URLSearchParams({
    client_id:     env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri:  env.SPOTIFY_REDIRECT_URI,
    scope: [
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-modify-private',
    ].join(' '),
    show_dialog:   'true',
  });
  return Response.redirect(`https://accounts.spotify.com/authorize?${params}`, 302);
}

// ── Step 2: exchange code for refresh token ────────────────────────────────
async function handleCallback(url, env) {
  const code = url.searchParams.get('code');
  if (!code) return new Response('Missing ?code parameter', { status: 400 });

  const res  = await tokenRequest(env, {
    grant_type:   'authorization_code',
    code,
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
  });
  const data = await res.json();

  if (!data.refresh_token) {
    return new Response(`Spotify error: ${JSON.stringify(data)}`, { status: 500 });
  }

  return new Response(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Spotify auth — done</title></head>
<body style="font-family:monospace;max-width:600px;margin:3rem auto;padding:0 1.5rem;line-height:1.6">
  <h2>Authorization successful</h2>
  <p>Run the command below, then paste the token when prompted:</p>
  <pre style="background:#f0ede8;padding:1rem">npx wrangler secret put SPOTIFY_REFRESH_TOKEN</pre>
  <p><strong>Your refresh token:</strong></p>
  <textarea readonly style="width:100%;height:90px;font-family:monospace;font-size:0.75rem">${data.refresh_token}</textarea>
  <p style="color:#666;font-size:0.85rem;margin-top:2rem">
    After saving the secret:<br><code>npx wrangler deploy</code>
  </p>
</body>
</html>`, { headers: { 'Content-Type': 'text/html' } });
}

// ── Step 3: build/update a playlist from recent tracks, return its ID ──────
async function handlePlaylist(env, cors) {
  if (!env.SPOTIFY_REFRESH_TOKEN) {
    return json({ error: 'not_configured' }, cors, 503);
  }

  try {
    const token = await getAccessToken(env);
    const h     = {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Fetch up to 50 recent tracks and deduplicate
    const recentRes  = await fetch(`${SPOTIFY_API}/me/player/recently-played?limit=50`, { headers: h });
    const recentData = await recentRes.json();

    if (!recentData?.items?.length) {
      return json({ error: 'no_recent_tracks' }, cors, 404);
    }

    const seen      = new Set();
    const trackUris = recentData.items
      .filter(({ track }) => {
        if (seen.has(track.id)) return false;
        seen.add(track.id);
        return true;
      })
      .slice(0, 20)
      .map(({ track }) => `spotify:track:${track.id}`);

    // Find the managed playlist in the user's library (first 50 playlists)
    const plRes  = await fetch(`${SPOTIFY_API}/me/playlists?limit=50`, { headers: h });
    const plData = await plRes.json();
    if (!plRes.ok) throw new Error(`playlists_error: ${JSON.stringify(plData)}`);
    let playlistId = plData.items?.find(p => p.name === PLAYLIST_NAME)?.id ?? null;

    if (!playlistId) {
      // Create it once
      const meRes       = await fetch(`${SPOTIFY_API}/me`, { headers: h });
      const me          = await meRes.json();
      if (!me.id) throw new Error(`me_error: ${JSON.stringify(me)}`);
      const createRes   = await fetch(`${SPOTIFY_API}/me/playlists`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          name:        PLAYLIST_NAME,
          description: 'Auto-updated from loriechen.com',
          public:      false,
        }),
      });
      const created = await createRes.json();
      if (!created.id) throw new Error(`create_error: ${JSON.stringify(created)}`);
      playlistId = created.id;
    }

    // Replace playlist tracks with deduplicated recent tracks
    await fetch(`${SPOTIFY_API}/playlists/${playlistId}/tracks`, {
      method:  'PUT',
      headers: h,
      body:    JSON.stringify({ uris: trackUris }),
    });

    return json({ playlistId }, cors);

  } catch (err) {
    return json({ error: 'server_error', detail: err.message }, cors, 500);
  }
}

// ── Debug: show token scopes ───────────────────────────────────────────────
async function handleDebug(env, cors) {
  try {
    const token = await getAccessToken(env);
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const meRes  = await fetch(`${SPOTIFY_API}/me`, { headers: h });
    const me     = await meRes.json();

    const plRes  = await fetch(`${SPOTIFY_API}/me/playlists?limit=5`, { headers: h });
    const plData = await plRes.json();

    const createRes = await fetch(`${SPOTIFY_API}/me/playlists`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ name: 'debug-test', public: false }),
    });
    const createData = await createRes.json();

    return json({
      user_id:        me.id,
      playlists_ok:   plRes.ok,
      playlists_err:  plData.error ?? null,
      create_status:  createRes.status,
      create_result:  createData,
    }, cors);
  } catch (err) {
    return json({ error: err.message }, cors, 500);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function getAccessToken(env) {
  const res  = await tokenRequest(env, {
    grant_type:    'refresh_token',
    refresh_token: env.SPOTIFY_REFRESH_TOKEN,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`token_error: ${JSON.stringify(data)}`);
  return data.access_token;
}

function tokenRequest(env, body) {
  const credentials = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
  return fetch(SPOTIFY_TOKEN_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });
}

function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
