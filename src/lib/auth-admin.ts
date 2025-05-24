import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { logger } from './logger';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!privateKey) {
    logger.logError('FIREBASE_PRIVATE_KEY is not set in environment variables');
    throw new Error('FIREBASE_PRIVATE_KEY is not set in environment variables');
  }

  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle both formats: already containing \n or actual newlines
        privateKey: privateKey.includes('\\n') 
          ? privateKey.replace(/\\n/g, '\n')
          : privateKey,
      }),
    });
    logger.log('Firebase Admin initialized successfully');
  } catch (error) {
    logger.logError(error, 'Error initializing Firebase Admin');
    throw error;
  }
}

export async function verifyAuth(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    logger.logRequest(req, { 
      context: 'verifyAuth',
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader ? (authHeader.startsWith('Bearer ') ? 'valid' : 'invalid') : 'none'
    });

    if (!authHeader?.startsWith('Bearer ')) {
      logger.log('No valid auth header found');
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await auth().verifyIdToken(token);
      logger.log({
        context: 'verifyAuth',
        status: 'success',
        uid: decodedToken.uid,
        email: decodedToken.email
      });
      return decodedToken;
    } catch (error) {
      logger.logError(error, 'Token verification failed');
      return null;
    }
  } catch (error) {
    logger.logError(error, 'Auth verification error');
    return null;
  }
}

export async function withAuth(handler: Function) {
  return async function authHandler(req: NextRequest) {
    const user = await verifyAuth(req);
    
    if (!user) {
      logger.log({
        context: 'withAuth',
        status: 'unauthorized',
        path: req.nextUrl.pathname
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.log({
      context: 'withAuth',
      status: 'authorized',
      path: req.nextUrl.pathname,
      uid: user.uid
    });
    
    return handler(req, user);
  };
} 