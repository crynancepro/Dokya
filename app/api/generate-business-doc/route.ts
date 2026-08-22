import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { docType, issuer, client, items } = await req.json().catch(() => ({}));

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      // Return structured sanitized items
      const formattedItems = (items || []).map((it: any, idx: number) => ({
        id: it.id || `item-${idx + 1}`,
        description: it.description?.trim() 
          ? it.description.trim().charAt(0).toUpperCase() + it.description.trim().slice(1)
          : 'Prestation professionnelle spécialisée',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 50000,
        total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 50000)
      }));

      return NextResponse.json({
        success: true,
        items: formattedItems,
        notes: "Validité de l'offre : 30 jours à compter de la date d'émission.\nAcompte de 50% à la validation, solde à la livraison."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Tu es un expert en gestion commerciale et facturation pour les entreprises au Sénégal et dans la zone UEMOA (OHADA).
Améliore et professionnalise les lignes de devis / facture ci-dessous pour qu'elles soient claires, précises, vendeuses et parfaitement rédigées en français commercial soutenu.

Type de document : ${docType === 'devis' ? 'Devis Professionnel' : 'Facture Client'}
Émetteur : ${issuer?.companyName || 'Entreprise de services'} (${issuer?.city || 'Dakar'}, Sénégal)
Client : ${client?.companyName || client?.name || 'Client'}

Lignes actuelles :
${JSON.stringify(items || [], null, 2)}

Réponds UNIQUEMENT avec un objet JSON valide contenant :
{
  "items": [
    {
      "id": "string",
      "description": "Description commerciale ultra-pro avec détails clés ou livrables",
      "quantity": 1,
      "unitPrice": 50000,
      "total": 50000
    }
  ],
  "notes": "Conditions de règlement et mentions légales adaptées (acompte, délai, validité)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (parsed && parsed.items) {
      return NextResponse.json({
        success: true,
        items: parsed.items,
        notes: parsed.notes
      });
    }

    return NextResponse.json({
      success: true,
      items: items || [],
      notes: "Validité de l'offre : 30 jours. Acompte de 50% à la commande."
    });

  } catch (error: any) {
    console.error('Error generating business doc:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Erreur lors de la génération'
    }, { status: 500 });
  }
}
