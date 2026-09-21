import { NextResponse } from 'next/server';
import { verifyPayment } from '@/api/moneyfusion/verify';

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}

async function handleRequest(req: Request) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const queryParams = Object.fromEntries(url.searchParams.entries());

    let bodyParams = {};
    if (req.method === 'POST') {
      try {
        bodyParams = await req.json();
      } catch (_e) {
        bodyParams = {};
      }
    }

    const mergedParams = { ...queryParams, ...bodyParams };
    const result = await verifyPayment(mergedParams);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[App API Verify Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur interne de vérification' },
      { status: 500 }
    );
  }
}
