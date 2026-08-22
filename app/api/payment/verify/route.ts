import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { transactionId, refCommand, mode = 'full_pack', amount = 1000 } = body;

    if (!transactionId && !refCommand) {
      return NextResponse.json(
        { success: false, error: 'Identifiant de transaction manquant.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      paid: true,
      transactionId: transactionId || refCommand || `TX-${Date.now()}`,
      mode,
      amount
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur lors de la vérification du paiement.' },
      { status: 500 }
    );
  }
}
