const admin = require('firebase-admin');
const config = require('./environment');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            privateKey: config.firebase.privateKey,
            clientEmail: config.firebase.clientEmail,
        }),
        databaseURL: config.firebase.databaseUrl,
    });
}

// Firestore instance
const firestore = admin.firestore();

// Firebase Cloud Messaging instance
const messaging = admin.messaging();

// Firebase Auth instance
const auth = admin.auth();

/**
 * Send push notification to multiple devices
 * @param {Array<string>} tokens - FCM device tokens
 * @param {Object} notification - Notification payload
 * @returns {Promise}
 */
const sendPushNotification = async (tokens, notification) => {
    if (!tokens || tokens.length === 0) {
        return;
    }

    const { title, body, data = {} } = notification;

    const message = {
        notification: {
            title,
            body,
        },
        data: Object.entries(data).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
        }, {}),
        tokens,
    };

    try {
        const response = await messaging.sendEachForMulticast(message);
        console.log(`${response.successCount} messages sent successfully`);

        // Handle failed tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            console.log('Failed tokens:', failedTokens);
        }

        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
};

module.exports = {
    admin,
    firestore,
    messaging,
    auth,
    sendPushNotification,
};
