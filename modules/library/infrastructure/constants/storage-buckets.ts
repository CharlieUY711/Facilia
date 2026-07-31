export const PUBLIC_LIBRARY_BUCKET = "public-library";
export const PRIVATE_LIBRARY_BUCKET = "private-library";

export const LIBRARY_BUCKETS = [PUBLIC_LIBRARY_BUCKET, PRIVATE_LIBRARY_BUCKET] as const;

export const SIGNED_URL_EXPIRATION_SECONDS = 60 * 5; // 5 minutos
