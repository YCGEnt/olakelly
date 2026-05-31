"use strict";

const memoryStore = new Map();

function now() {
  return Date.now();
}

function hasRedisConfig() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
  );
}

function validateRedisConfig() {
  const redisUrl = String(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim();
  const redisToken = String(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  if (!redisUrl || !redisToken) {
    throw new Error("Upstash Redis REST URL or token is not configured.");
  }
  try {
    const parsedUrl = new URL(redisUrl);
    if (parsedUrl.protocol !== "https:") throw new Error("Expected HTTPS.");
  } catch (_error) {
    throw new Error("Upstash Redis REST URL is invalid. Use the HTTPS REST URL from the Vercel Upstash integration.");
  }
}

function allowMemoryStore() {
  return String(process.env.ALLOW_IN_MEMORY_SECURITY_STORE || "").toLowerCase() === "true";
}

function getRedis() {
  if (!hasRedisConfig()) {
    if (allowMemoryStore()) return null;
    throw new Error("Upstash Redis is not configured.");
  }
  validateRedisConfig();
  try {
    return require("./redis").redis;
  } catch (error) {
    if (allowMemoryStore()) return null;
    throw error;
  }
}

function pruneMemoryKey(key) {
  const entry = memoryStore.get(key);
  if (entry && entry.expiresAt && entry.expiresAt <= now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry;
}

async function get(key) {
  const redis = getRedis();
  if (redis) return redis.get(key);
  const entry = pruneMemoryKey(key);
  return entry ? entry.value : null;
}

async function getdel(key) {
  const redis = getRedis();
  if (redis) return redis.getdel(key);
  const entry = pruneMemoryKey(key);
  memoryStore.delete(key);
  return entry ? entry.value : null;
}

async function set(key, value, ttlSeconds) {
  const redis = getRedis();
  if (redis) {
    if (ttlSeconds) return redis.set(key, value, { ex: ttlSeconds });
    return redis.set(key, value);
  }
  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds ? now() + ttlSeconds * 1000 : null
  });
  return value;
}

async function del(key) {
  const redis = getRedis();
  if (redis) return redis.del(key);
  memoryStore.delete(key);
  return 1;
}

async function incr(key, ttlSeconds) {
  const redis = getRedis();
  if (redis) {
    const value = await redis.incr(key);
    if (value === 1 && ttlSeconds) await redis.expire(key, ttlSeconds);
    return value;
  }
  const entry = pruneMemoryKey(key);
  const value = Number(entry ? entry.value : 0) + 1;
  memoryStore.set(key, {
    value,
    expiresAt: entry?.expiresAt || (ttlSeconds ? now() + ttlSeconds * 1000 : null)
  });
  return value;
}

async function pushCapped(key, value, maxItems, ttlSeconds) {
  const redis = getRedis();
  if (redis) {
    await redis.lpush(key, value);
    await redis.ltrim(key, 0, maxItems - 1);
    if (ttlSeconds) await redis.expire(key, ttlSeconds);
    return;
  }
  const entry = pruneMemoryKey(key);
  const list = Array.isArray(entry?.value) ? entry.value : [];
  list.unshift(value);
  memoryStore.set(key, {
    value: list.slice(0, maxItems),
    expiresAt: ttlSeconds ? now() + ttlSeconds * 1000 : entry?.expiresAt || null
  });
}

async function list(key, start = 0, stop = -1) {
  const redis = getRedis();
  if (redis) return redis.lrange(key, start, stop);
  const entry = pruneMemoryKey(key);
  const listValue = Array.isArray(entry?.value) ? entry.value : [];
  return stop === -1 ? listValue.slice(start) : listValue.slice(start, stop + 1);
}

module.exports = {
  del,
  get,
  getdel,
  incr,
  list,
  pushCapped,
  set,
  validateRedisConfig
};
