const { google } = require('googleapis');
const config = require('./environment');

// OAuth2 Client for Google Drive API
const oauth2Client = new google.auth.OAuth2(
    config.googleDrive.clientId,
    config.googleDrive.clientSecret,
    config.googleDrive.redirectUri
);

// Set credentials if refresh token is available
if (config.googleDrive.refreshToken) {
    oauth2Client.setCredentials({
        refresh_token: config.googleDrive.refreshToken,
    });
}

// Google Drive API instance
const drive = google.drive({ version: 'v3', auth: oauth2Client });

/**
 * Get authorization URL for user consent
 * @returns {string} Authorization URL
 */
const getAuthUrl = () => {
    const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
    });
};

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code
 * @returns {Promise<Object>} Tokens
 */
const getTokensFromCode = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
};

module.exports = {
    oauth2Client,
    drive,
    getAuthUrl,
    getTokensFromCode,
};
