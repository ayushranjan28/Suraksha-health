'use strict';

const { OAuth2Client } = require('google-auth-library');
const config = require('../config');

const client = new OAuth2Client(config.googleClientId);

/**
 * Verify a Google ID token and extract user information.
 *
 * @param {string} idToken - The credential string from Google Sign-In
 * @returns {Promise<{ googleId: string, email: string, fullName: string, avatarUrl: string | null }>}
 * @throws {Error} If the token is invalid or verification fails
 */
async function verifyGoogleToken(idToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Google token payload is empty.');
    }

    if (!payload.email_verified) {
      throw new Error('Google email is not verified.');
    }

    return {
      googleId:  payload.sub,
      email:     payload.email,
      fullName:  payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture || null,
    };
  } catch (error) {
    // Re-throw with a cleaner message for known Google auth errors
    if (error.message.includes('Token used too late') ||
        error.message.includes('Invalid token') ||
        error.message.includes('Wrong number of segments')) {
      const err = new Error('Invalid or expired Google token.');
      err.status = 401;
      throw err;
    }
    throw error;
  }
}

module.exports = { verifyGoogleToken };
