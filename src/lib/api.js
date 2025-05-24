"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithAuth = fetchWithAuth;
const firebase_1 = require("./firebase");
async function getAuthToken() {
    const user = firebase_1.auth.currentUser;
    if (!user) {
        throw new Error('Not authenticated');
    }
    return user.getIdToken();
}
async function fetchWithAuth(url, options = {}) {
    try {
        const token = await getAuthToken();
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        return data;
    }
    catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}
//# sourceMappingURL=api.js.map