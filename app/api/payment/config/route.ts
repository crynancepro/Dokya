import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const publicKey = process.env.KKIAPAY_PUBLIC_KEY || process.env.VITE_KKIAPAY_PUBLIC_KEY || '632596be79bf1eb62a1c0d4a7c1543ed9b55beec';
    const isSandbox = process.env.KKIAPAY_SANDBOX === 'false' ? false : true;

    return NextResponse.json({
      publicKey,
      sandbox: isSandbox,
      currency: 'XOF'
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur lors de la récupération de la configuration.' },
      { status: 500 }
    );
  }
}
