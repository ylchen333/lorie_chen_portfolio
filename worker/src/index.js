const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API      = 'https://api.spotify.com/v1';

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';

    // Allow the portfolio domain and any Cloudflare Pages preview URLs
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
      case '/auth':            return handleAuth(env);
      case '/callback':        return handleCallback(url, env);
      case '/recent-tracks':   return handleRecentTracks(env, cors);
      default:                 return new Response('Not found', { status: 404 });
    }
  },
};

// ── Step 1: redirect user to Spotify authorization ─────────────────────────
function handleAuth(env) {
  const params = new URLSearchParams({
    client_id:     env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri:  env.SPOTIFY_REDIRECT_URI,
    scope:         'user-read-currently-playing user-read-recently-played',
  });
  return Response.redirect(`https://accounts.spotify.com/authorize?${params}`, 302);
}

// ── Step 2: exchange authorization code for refresh token ──────────────────
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
    return new Response(`Spotify returned an error: ${JSON.stringify(data)}`, { status: 500 });
  }

  return new Response(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Spotify auth — done</title></head>
<body style="font-family:monospace;max-width:600px;margin:3rem auto;padding:0 1.5rem;line-height:1.6">
  <h2>Authorization successful</h2>
  <p>Run the command below, then paste the token when prompted:</p>
  <pre style="background:#f0ede8;padding:1rem">npx wrangler secret put SPOTIFY_REFRESH_TOKEN</pre>
  <p><strong>Your refresh token (one-time — save it now):</strong></p>
  <textarea readonly style="width:100%;height:90px;font-family:monospace;font-size:0.75rem">${data.refresh_token}</textarea>
  <p style="color:#666;font-size:0.85rem;margin-top:2rem">
    After saving the secret, redeploy the Worker:<br>
    <code>npx wrangler deploy</code>
  </p>
</body>
</html>`, { headers: { 'Content-Type': 'text/html' } });
}

// ── Step 3: fetch 50 recent tracks, dedupe, shuffle, return 10 ────────────
async function handleRecentTracks(env, cors) {
  if (!env.SPOTIFY_REFRESH_TOKEN) {
    return json({ error: 'not_configured' }, cors, 503);
  }

  try {
    const token = await getAccessToken(env);
    const res   = await fetch(
      `${SPOTIFY_API}/me/player/recently-played?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data  = await res.json();

    if (!data?.items?.length) {
      return json({ error: 'no_recent_tracks' }, cors, 404);
    }

    // Deduplicate by track id, then shuffle, then take 10
    const seen   = new Set();
    const unique = data.items
      .filter(({ track }) => {
        if (seen.has(track.id)) return false;
        seen.add(track.id);
        return true;
      })
      .map(({ track }) => ({
        id:     track.id,
        name:   track.name,
        artist: track.artists.map(a => a.name).join(', '),
        thumb:  track.album.images.at(-1)?.url ?? null, // smallest thumbnail
      }));

    // Fisher-Yates shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return json({ tracks: unique.slice(0, 10) }, cors);

  } catch (err) {
    return json({ error: 'server_error', detail: err.message }, cors, 500);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function getAccessToken(env) {
  const res  = await tokenRequest(env, {
    grant_type:    'refresh_token',
    refresh_token: env.SPOTIFY_REFRESH_TOKEN,
  });
  const data = await res.json();
  return data.access_token;
}

function tokenRequest(env, body) {
  const credentials = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
  return fetch(SPOTIFY_TOKEN_URL, {
    method:  'POST',
    headers: {
      'Authorization':  `Basic ${credentials}`,
      'Content-Type':   'application/x-www-form-urlencoded',
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
