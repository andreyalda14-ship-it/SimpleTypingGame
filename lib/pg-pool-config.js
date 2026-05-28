"use strict";

/**
 * DigitalOcean (and most managed Postgres) need TLS with rejectUnauthorized: false
 * unless you supply their CA bundle. sslmode= in the URL must be removed or pg
 * overwrites the ssl object and may enforce verify-full (self-signed chain error).
 */
function stripSslParamsFromUrl(connectionString) {
  let out = connectionString;
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    parsed.searchParams.delete("uselibpqcompat");
    out = parsed.toString();
    if (out.endsWith("?")) out = out.slice(0, -1);
  } catch {
    out = connectionString
      .replace(/([?&])sslmode=[^&]*/gi, "")
      .replace(/([?&])ssl=[^&]*/gi, "")
      .replace(/([?&])uselibpqcompat=[^&]*/gi, "")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
  return out;
}

function getSslConfig(connectionString) {
  if (process.env.DATABASE_SSL === "0") return false;

  // Production (App Platform): always TLS; DO CA is not in Node's default trust store
  if (process.env.NODE_ENV === "production") {
    return { rejectUnauthorized: false };
  }

  if (process.env.DATABASE_SSL === "1") {
    return { rejectUnauthorized: false };
  }

  if (
    /sslmode=require/i.test(connectionString) ||
    /sslmode=verify-full/i.test(connectionString) ||
    /ondigitalocean\.com/i.test(connectionString)
  ) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

function buildPgPoolConfig(connectionString) {
  const stripped = stripSslParamsFromUrl(connectionString);
  const ssl = getSslConfig(connectionString);

  const config = { connectionString: stripped };
  if (ssl !== undefined) {
    config.ssl = ssl;
  }
  return config;
}

module.exports = { buildPgPoolConfig, stripSslParamsFromUrl, getSslConfig };
