/** HttpOnly cookie name for beta unlock (avoid generic names). */
export const BETA_COOKIE_NAME = 'acerca_beta'

/** Default session length (30 days), seconds. */
export const BETA_TOKEN_TTL_SEC = 30 * 24 * 60 * 60

/** Label for deriving the cookie HMAC key from the password (must stay stable). */
export const BETA_KEY_DERIVATION_LABEL = 'beta-cookie-key-v1'
