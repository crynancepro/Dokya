import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, amount = 1000, currentBalance = 0, documentTitle = 'Document SénégalCV' } = body;

    const debitAmount = Number(amount) || 0;
    const balance = Number(currentBalance) || 0;

    if (debitAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Montant de paiement invalide.' },
        { status: 400 }
      );
    }

    if (balance < debitAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Solde insuffisant. Votre solde actuel est de ${balance.toLocaleString('fr-FR')} FCFA, mais ${debitAmount.toLocaleString('fr-FR')} FCFA sont requis pour débloquer ce document. Veuillez recharger votre solde.`
        },
        { status: 400 }
      );
    }

    const newBalance = balance - debitAmount;
    const txId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const transaction = {
      id: txId,
      userId: userId || 'guest',
      type: 'document_purchase',
      amount: -debitAmount,
      currency: 'XOF',
      description: `Achat & Téléchargement : ${documentTitle}`,
      status: 'success',
      createdAt: new Date().toISOString(),
      paymentMethod: 'wallet',
      newBalance,
      documentTitle
    };

    return NextResponse.json({
      success: true,
      newBalance,
      transaction,
      message: `Paiement de ${debitAmount.toLocaleString('fr-FR')} FCFA validé depuis votre solde Wallet. Téléchargement autorisé.`
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erreur lors du débit du solde utilisateur.'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    balance: 1000,
    currency: 'XOF',
    status: 'active'
  });
}
