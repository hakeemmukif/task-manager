"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuth = verifyAuth;
exports.withAuth = withAuth;
const server_1 = require("next/server");
const firebase_admin_1 = require("firebase-admin");
const app_1 = require("firebase-admin/app");
// Initialize Firebase Admin if not already initialized
if ((0, app_1.getApps)().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY is not set in environment variables');
    }
    try {
        (0, app_1.initializeApp)({
            credential: (0, app_1.cert)({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Handle both formats: already containing \n or actual newlines
                privateKey: privateKey.includes('\\n')
                    ? privateKey.replace(/\\n/g, '\n')
                    : privateKey,
            }),
        });
    }
    catch (error) {
        console.error('Error initializing Firebase Admin:', error);
        throw error;
    }
}
async function verifyAuth(req) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await (0, firebase_admin_1.auth)().verifyIdToken(token);
        return decodedToken;
    }
    catch (error) {
        console.error('Auth error:', error);
        return null;
    }
}
async function withAuth(handler) {
    return async function authHandler(req) {
        const user = await verifyAuth(req);
        if (!user) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return handler(req, user);
    };
}
//# sourceMappingURL=auth-admin.js.map