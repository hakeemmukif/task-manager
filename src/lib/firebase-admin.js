"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDb = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};
// Initialize Firebase Admin
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)({
        credential: (0, app_1.cert)(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}
exports.adminDb = (0, firestore_1.getFirestore)();
exports.default = exports.adminDb;
//# sourceMappingURL=firebase-admin.js.map