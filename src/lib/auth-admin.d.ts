import { NextRequest } from 'next/server';
export declare function verifyAuth(req: NextRequest): Promise<import("firebase-admin/lib/auth/token-verifier").DecodedIdToken | null>;
export declare function withAuth(handler: Function): Promise<(req: NextRequest) => Promise<any>>;
//# sourceMappingURL=auth-admin.d.ts.map