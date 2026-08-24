import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, PageBreak } from 'docx';
import { CVFormData, AIOptimizedData, BusinessDocData, EbookData } from '../types';

/**
 * Exports the CV as a formatted DOCX document using the docx library.
 */
export async function exportCVToDocx(formData: CVFormData, aiData?: AIOptimizedData | null) {
  const personalInfo = formData?.personalInfo || ({} as any);
  const experiences = formData?.experiences || [];
  const education = formData?.education || [];
  const skills = formData?.skills || [];
  const languages = formData?.languages || [];
  const hobbies = formData?.hobbies || [];
  const customSections = formData?.customSections || [];
  const freeTextBlocks = formData?.freeTextBlocks || [];
  const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim() || 'Candidat';

  const docChildren: any[] = [];

  // Header - Name
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: fullName.toUpperCase(),
          bold: true,
          size: 32, // 16pt
          color: '1E293B',
        }),
      ],
    })
  );

  // Header - Target Job
  if (personalInfo.targetJob) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: personalInfo.targetJob,
            bold: true,
            size: 24, // 12pt
            color: '4F46E5', // Indigo
          }),
        ],
      })
    );
  }

  // Contact Info Line
  const contactParts: string[] = [];
  if (personalInfo.email) contactParts.push(`Email: ${personalInfo.email}`);
  if (personalInfo.phone) contactParts.push(`Tél: ${personalInfo.phone}`);
  if (personalInfo.city || personalInfo.country) {
    contactParts.push(`Adresse: ${[personalInfo.address, personalInfo.city, personalInfo.country].filter(Boolean).join(', ')}`);
  }
  if (personalInfo.linkedin) contactParts.push(`LinkedIn: ${personalInfo.linkedin}`);
  if (personalInfo.portfolio) contactParts.push(`Portfolio: ${personalInfo.portfolio}`);

  if (contactParts.length > 0) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactParts.join('  |  '),
            size: 18, // 9pt
            color: '64748B',
          }),
        ],
      })
    );
  }

  // Divider Line
  docChildren.push(
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: 'E2E8F0',
        },
      },
      spacing: { after: 200 },
    })
  );

  // Professional Summary
  if (aiData?.profileSummary) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: 'PROFIL PROFESSIONNEL',
            bold: true,
            size: 22,
            color: '1E293B',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: aiData.profileSummary,
            size: 20,
            color: '334155',
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Work Experiences
  if (experiences && experiences.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: 'EXPÉRIENCES PROFESSIONNELLES',
            bold: true,
            size: 22,
            color: '1E293B',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    experiences.forEach((exp) => {
      // Position and Company Header
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${exp.position} `,
              bold: true,
              size: 21,
              color: '1E293B',
            }),
            new TextRun({
              text: `— ${exp.company}`,
              bold: true,
              size: 20,
              color: '4F46E5',
            }),
            new TextRun({
              text: exp.location ? ` (${exp.location})` : '',
              size: 18,
              color: '64748B',
            }),
          ],
        })
      );

      // Dates
      const dateText = `${exp.startDate || ''} - ${exp.current ? 'Présent' : exp.endDate || ''}`;
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: dateText,
              italics: true,
              size: 18,
              color: '64748B',
            }),
          ],
          spacing: { after: 60 },
        })
      );

      // Check AI optimized bullets first
      const aiExp = aiData?.experiences?.find((e) => e.id === exp.id);
      if (aiExp && aiExp.optimizedDescription && aiExp.optimizedDescription.length > 0) {
        aiExp.optimizedDescription.forEach((bullet) => {
          docChildren.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: bullet,
                  size: 20,
                  color: '334155',
                }),
              ],
              spacing: { after: 40 },
            })
          );
        });
      } else if (exp.description) {
        const lines = exp.description.split('\n').filter((l) => l.trim().length > 0);
        lines.forEach((line) => {
          docChildren.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: line.replace(/^[•\-\*\s]+/, ''),
                  size: 20,
                  color: '334155',
                }),
              ],
              spacing: { after: 40 },
            })
          );
        });
      }

      docChildren.push(new Paragraph({ spacing: { after: 120 } }));
    });
  }

  // Education
  if (education && education.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: 'FORMATION & DIPLÔMES',
            bold: true,
            size: 22,
            color: '1E293B',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    education.forEach((edu) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${edu.degree} ${edu.fieldOfStudy ? 'en ' + edu.fieldOfStudy : ''} `,
              bold: true,
              size: 21,
              color: '1E293B',
            }),
            new TextRun({
              text: `— ${edu.institution}`,
              bold: true,
              size: 20,
              color: '4F46E5',
            }),
          ],
        })
      );

      const dateText = `${edu.startDate || ''} - ${edu.current ? 'En cours' : edu.endDate || ''}`;
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: dateText,
              italics: true,
              size: 18,
              color: '64748B',
            }),
          ],
          spacing: { after: 100 },
        })
      );
    });
  }

  // Skills
  if (skills && skills.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: 'COMPÉTENCES',
            bold: true,
            size: 22,
            color: '1E293B',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    skills.forEach((cat) => {
      if (cat.skills && cat.skills.length > 0) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${cat.category}: `,
                bold: true,
                size: 20,
                color: '1E293B',
              }),
              new TextRun({
                text: cat.skills.join(', '),
                size: 20,
                color: '334155',
              }),
            ],
            spacing: { after: 60 },
          })
        );
      }
    });
    docChildren.push(new Paragraph({ spacing: { after: 120 } }));
  }

  // Languages
  if (languages && languages.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: 'LANGUES',
            bold: true,
            size: 22,
            color: '1E293B',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    const langText = languages.map((l) => `${l.name} (${l.level})`).join('  |  ');
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: langText,
            size: 20,
            color: '334155',
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Hobbies / Centers of interest
  if (hobbies && hobbies.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "CENTRES D'INTÉRÊT",
            bold: true,
            size: 22,
            color: '1E293B',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: hobbies.join('  •  '),
            size: 20,
            color: '334155',
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Custom Sections
  if (customSections && customSections.length > 0) {
    customSections.forEach((sec) => {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: sec.title.toUpperCase(),
              bold: true,
              size: 22,
              color: '1E293B',
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: sec.content,
              size: 20,
              color: '334155',
            }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  }

  // Free Text Blocks
  if (freeTextBlocks && freeTextBlocks.length > 0) {
    freeTextBlocks.forEach((block) => {
      if (block.title) {
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: block.title.toUpperCase(),
                bold: true,
                size: 22,
                color: '1E293B',
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );
      }
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: block.text,
              size: 20,
              color: '334155',
            }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  }

  // Generate Document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  // Pack and Download
  const blob = await Packer.toBlob(doc);
  const fileName = `CV_${fullName.replace(/[\s\/\\]+/g, '_')}.docx`;

  const downloadAnchor = document.createElement('a');
  const url = URL.createObjectURL(blob);
  downloadAnchor.href = url;
  downloadAnchor.download = fileName;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Exports the Cover Letter as a formatted DOCX document using the docx library.
 */
export async function exportLetterToDocx(formData: CVFormData, aiData?: AIOptimizedData | null) {
  const personalInfo = formData?.personalInfo || ({} as any);
  const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim() || 'Candidat';
  const todayDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const letter = aiData?.coverLetter || {
    subject: `Candidature${personalInfo.targetJob ? ` au poste de ${personalInfo.targetJob}` : ''}${formData.targetCompany ? ` - ${formData.targetCompany}` : ''}`,
    greeting: 'Madame, Monsieur le Responsable des Recrutements,',
    opening: `C'est avec un vif intérêt et un réel enthousiasme que je vous soumets ma candidature pour le poste de ${personalInfo.targetJob || 'professionnel qualifié'} au sein de ${formData.targetCompany ? formData.targetCompany : 'votre entreprise'}. Reconnu pour son dynamisme, son exigence de qualité et son positionnement stratégique sur le marché, votre établissement incarne une référence d'excellence au sein de laquelle je souhaite activement investir mes compétences et mon engagement.`,
    bodyParagraphs: [
      `Fort d'un parcours solide et diversifié dans mon domaine d'activité, j'ai acquis une maîtrise approfondie des méthodologies opérationnelles et des outils indispensables à la performance de mes fonctions. Mon sens aigu de l'organisation et mon esprit d'analyse m'ont permis de piloter des projets stratégiques d'envergure, de surmonter des problématiques complexes et d'atteindre avec régularité des objectifs ambitieux et chiffrés.`,
      `Intégrer ${formData.targetCompany || 'votre structure'} constitue pour moi une opportunité majeure de conjuguer mes compétences à vos ambitions de développement. Parfaitement au fait des enjeux et spécificités économiques à ${personalInfo.city || 'Dakar'} et dans la sous-région UEMOA, je suis convaincu que ma proactivité, mon leadership collaboratif et ma force de proposition apporteront une valeur ajoutée concrète et immédiate à vos équipes.`
    ],
    callToAction: `Convaincu de la parfaite adéquation entre vos besoins et mon profil, je serais honoré de vous rencontrer lors d'un entretien à votre convenance afin de vous exposer de vive voix le détail de mes motivations et mes perspectives de contribution. Je me tiens à votre entière disposition pour convenir d'une date d'échange.`,
    closing: `Dans l'attente de votre précieux retour, je vous prie d'agréer, Madame, Monsieur le Responsable des Recrutements, l'expression de mes salutations les plus distinguées et respectueuses.`
  };

  const docChildren: any[] = [];

  // Header - Candidate Info
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: fullName.toUpperCase(), bold: true, size: 24, color: '1E293B' }),
      ],
    })
  );
  if (personalInfo.targetJob) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: personalInfo.targetJob, bold: true, size: 20, color: '4F46E5' }),
        ],
      })
    );
  }
  docChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `${personalInfo.phone || ''}  |  ${personalInfo.email || ''}  |  ${personalInfo.city || 'Dakar'}, Sénégal`,
          size: 18,
          color: '64748B',
        }),
      ],
    })
  );

  // Recipient / Date
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: `À l'attention du Responsable des Recrutements\n`, bold: true, size: 18, color: '1E293B' }),
        ...(formData.targetCompany ? [new TextRun({ text: `${formData.targetCompany}\n`, bold: true, size: 20, color: '4F46E5' })] : []),
        new TextRun({ text: `Fait à ${personalInfo.city || 'Dakar'}, le ${todayDate}`, size: 18, color: '64748B' }),
      ],
    })
  );

  // Subject Line
  docChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({ text: 'Objet : ', bold: true, size: 20, color: '4F46E5' }),
        new TextRun({ text: letter.subject, bold: true, size: 20, color: '1E293B' }),
      ],
    })
  );

  // Greeting
  docChildren.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: letter.greeting, size: 20, color: '1E293B' })],
    })
  );

  // Opening
  docChildren.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: letter.opening, size: 20, color: '334155' })],
    })
  );

  // Body Paragraphs
  letter.bodyParagraphs.forEach((para) => {
    docChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: para, size: 20, color: '334155' })],
      })
    );
  });

  // Call to action
  docChildren.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: letter.callToAction, size: 20, color: '334155' })],
    })
  );

  // Closing
  docChildren.push(
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: letter.closing, size: 20, color: '334155' })],
    })
  );

  // Signature
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: fullName, bold: true, size: 22, color: '1E293B' }),
      ],
    })
  );

  // Generate Document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  // Pack and Download
  const blob = await Packer.toBlob(doc);
  const fileName = `Lettre_Motivation_${fullName.replace(/[\s\/\\]+/g, '_')}.docx`;

  const downloadAnchor = document.createElement('a');
  const url = URL.createObjectURL(blob);
  downloadAnchor.href = url;
  downloadAnchor.download = fileName;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Exports a Devis or Facture as a professional DOCX document.
 */
export async function exportBusinessDocToDocx(data: BusinessDocData) {
  const isQuote = data.type === 'devis';
  const currency = data.currency || 'FCFA';

  const subtotalHT = (data.items || []).reduce((acc, item) => {
    return acc + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
  }, 0);

  const discountAmount = data.discountPercent 
    ? Math.round((subtotalHT * data.discountPercent) / 100) 
    : 0;

  const netHT = subtotalHT - discountAmount;
  const vatRate = data.applyVat ? (data.vatRate ?? 18) : 0;
  const vatAmount = data.applyVat ? Math.round((netHT * vatRate) / 100) : 0;
  const totalTTC = netHT + vatAmount;

  const docChildren: any[] = [];

  // Title: DEVIS or FACTURE
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: isQuote ? 'DEVIS PROFESSIONNEL' : 'FACTURE CLIENT',
          bold: true,
          size: 28,
          color: isQuote ? 'B45309' : '4338CA',
        }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `N° ${data.docNumber || (isQuote ? 'DEV-2026-001' : 'FAC-2026-001')}`,
          bold: true,
          size: 22,
          color: '1E293B',
        }),
      ],
    })
  );

  // Issuer Info
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: (data.issuer.companyName || 'Mon Entreprise').toUpperCase(),
          bold: true,
          size: 24,
          color: '1E293B',
        }),
      ],
    })
  );

  if (data.issuer.name) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: data.issuer.name, bold: true, size: 20, color: '4338CA' })],
      })
    );
  }

  const issuerCoords = [
    data.issuer.address,
    data.issuer.city,
    data.issuer.country || 'Sénégal',
    data.issuer.phone ? `Tél: ${data.issuer.phone}` : '',
    data.issuer.email ? `Email: ${data.issuer.email}` : '',
    data.issuer.ninea ? `NINEA: ${data.issuer.ninea}` : ''
  ].filter(Boolean).join('  |  ');

  docChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [new TextRun({ text: issuerCoords, size: 18, color: '64748B' })],
    })
  );

  // Client Info Box
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: 'DESTINATAIRE / CLIENT :', bold: true, size: 18, color: '4338CA' }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: data.client.companyName || data.client.name || 'Client',
          bold: true,
          size: 22,
          color: '1E293B',
        }),
      ],
    })
  );

  if (data.client.address || data.client.city || data.client.phone) {
    const clientDetails = [
      data.client.name && data.client.companyName ? `Attn: ${data.client.name}` : '',
      data.client.address,
      data.client.city,
      data.client.phone ? `Tél: ${data.client.phone}` : ''
    ].filter(Boolean).join('  |  ');

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 300 },
        children: [new TextRun({ text: clientDetails, size: 18, color: '64748B' })],
      })
    );
  }

  // Dates
  const dateLine = `Date d'émission : ${data.issueDate || new Date().toISOString().split('T')[0]}  |  ${
    isQuote 
      ? `Validité de l'offre : ${data.validityDays || 30} jours`
      : `Échéance : ${data.dueDate || 'À réception'}`
  }`;

  docChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [new TextRun({ text: dateLine, bold: true, size: 18, color: '334155' })],
    })
  );

  // Table of Items
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Description de la prestation', bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Quantité', bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Prix Unit.', bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Total HT', bold: true, size: 20 })] })],
        }),
      ],
    }),
  ];

  (data.items || []).forEach((item) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.description, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.quantity || 1), size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${(Number(item.unitPrice) || 0).toLocaleString('fr-FR')} ${currency}`, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${lineTotal.toLocaleString('fr-FR')} ${currency}`, bold: true, size: 18 })] })],
          }),
        ],
      })
    );
  });

  docChildren.push(
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  );

  // Financial summary
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 300 },
      children: [
        new TextRun({ text: `Total Hors Taxe (HT) : `, size: 20 }),
        new TextRun({ text: `${subtotalHT.toLocaleString('fr-FR')} ${currency}`, bold: true, size: 20 }),
      ],
    })
  );

  if (data.discountPercent > 0) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `Remise (${data.discountPercent}%) : - `, size: 20 }),
          new TextRun({ text: `${discountAmount.toLocaleString('fr-FR')} ${currency}`, bold: true, size: 20 }),
        ],
      })
    );
  }

  if (data.applyVat) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `TVA (${vatRate}%) : `, size: 20 }),
          new TextRun({ text: `${vatAmount.toLocaleString('fr-FR')} ${currency}`, bold: true, size: 20 }),
        ],
      })
    );
  }

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: isQuote ? 'TOTAL DEVIS TTC : ' : 'NET À PAYER TTC : ', bold: true, size: 24, color: '1E293B' }),
        new TextRun({ text: `${totalTTC.toLocaleString('fr-FR')} ${currency}`, bold: true, size: 24, color: '4338CA' }),
      ],
    })
  );

  // Payment Details
  if (data.paymentInfo?.waveNumber || data.paymentInfo?.orangeMoneyNumber || data.paymentInfo?.ibanOrRib) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'COORDONNÉES DE PAIEMENT', bold: true, size: 20, color: '1E293B' })],
        spacing: { before: 200, after: 100 },
      })
    );

    if (data.paymentInfo.waveNumber) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Wave Sénégal : ', bold: true, size: 18 }),
            new TextRun({ text: data.paymentInfo.waveNumber, size: 18, color: '0284C7' }),
          ],
        })
      );
    }

    if (data.paymentInfo.orangeMoneyNumber) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Orange Money : ', bold: true, size: 18 }),
            new TextRun({ text: data.paymentInfo.orangeMoneyNumber, size: 18, color: 'EA580C' }),
          ],
        })
      );
    }

    if (data.paymentInfo.ibanOrRib) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Banque & RIB : ', bold: true, size: 18 }),
            new TextRun({ text: data.paymentInfo.ibanOrRib, size: 18 }),
          ],
        })
      );
    }
  }

  // Notes
  if (data.notes) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({ text: 'Conditions & Notes : ', bold: true, size: 18 }),
          new TextRun({ text: data.notes, size: 18, color: '64748B' }),
        ],
      })
    );
  }

  // Generate Document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  // Pack and Download
  const blob = await Packer.toBlob(doc);
  const fileName = `${isQuote ? 'Devis' : 'Facture'}_${data.docNumber || 'Document'}.docx`;

  const downloadAnchor = document.createElement('a');
  const url = URL.createObjectURL(blob);
  downloadAnchor.href = url;
  downloadAnchor.download = fileName;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Exports the complete Ebook (Front Cover, Copyright, Table of Contents, Chapters, Back Cover) to DOCX format.
 */
export async function exportEbookToDocx(ebookData: EbookData) {
  const docChildren: any[] = [];
  const frontProposal = ebookData.frontCover.proposals?.[ebookData.frontCover.selectedIndex] || ebookData.frontCover.proposals?.[0];
  const backProposal = ebookData.backCover.proposals?.[ebookData.backCover.selectedIndex] || ebookData.backCover.proposals?.[0];

  // 1. FRONT COVER (Page 1)
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 300 },
      children: [
        new TextRun({
          text: (frontProposal?.genreBadge || ebookData.genre || "ÉDITION OFFICIELLE").toUpperCase(),
          bold: true,
          size: 20, // 10pt
          color: '4F46E5',
        }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
      children: [
        new TextRun({
          text: ebookData.title || "Titre du Livre",
          bold: true,
          size: 52, // 26pt
          color: '0F172A',
        }),
      ],
    })
  );

  if (ebookData.subtitle) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
        children: [
          new TextRun({
            text: ebookData.subtitle,
            italics: true,
            size: 26, // 13pt
            color: '475569',
          }),
        ],
      })
    );
  }

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1800, after: 200 },
      children: [
        new TextRun({
          text: `Par ${ebookData.author || 'L\'auteur'}`,
          bold: true,
          size: 28, // 14pt
          color: '1E293B',
        }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Dokya AI Publishing • Auto-Édition Standard 6x9",
          size: 18,
          color: '64748B',
        }),
      ],
    })
  );

  // Page Break to Copyright Page
  docChildren.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // 2. COPYRIGHT PAGE (Page 2)
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1600, after: 300 },
      children: [
        new TextRun({
          text: ebookData.title,
          bold: true,
          size: 32,
          color: '0F172A',
        }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      spacing: { before: 2000, after: 200 },
      children: [
        new TextRun({
          text: `© ${new Date().getFullYear()} ${ebookData.author}. Tous droits réservés.`,
          bold: true,
          size: 20,
        }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "Aucune partie de cette publication ne peut être reproduite, distribuée ou transmise sous quelque forme que ce soit sans l'autorisation écrite préalable de l'auteur.",
          size: 18,
          color: '64748B',
        }),
      ],
    })
  );

  docChildren.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Langue : ${ebookData.language || 'Français'} | Format : Auto-Édition 6x9 | ISBN : ${backProposal?.isbnNumber || '978-2-84000-123-4'}`,
          size: 16,
          color: '94A3B8',
        }),
      ],
    })
  );

  // Page Break to Table of Contents
  docChildren.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // 3. TABLE OF CONTENTS (Page 3)
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 400 },
      children: [
        new TextRun({
          text: "Table des Matières",
          bold: true,
          size: 36,
          color: '4F46E5',
        }),
      ],
    })
  );

  if (ebookData.tableOfContents) {
    ebookData.tableOfContents.forEach((toc, idx) => {
      docChildren.push(
        new Paragraph({
          spacing: { before: 150, after: 150 },
          children: [
            new TextRun({
              text: `Chapitre ${toc.chapterNumber || (idx + 1)} : `,
              bold: true,
              size: 22,
              color: '1E293B',
            }),
            new TextRun({
              text: toc.title,
              size: 22,
              color: '334155',
            }),
          ],
        })
      );
    });
  }

  // 4. CHAPTERS CONTENT
  if (ebookData.chapters) {
    ebookData.chapters.forEach((chap, cIdx) => {
      docChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );

      // Chapter Heading
      docChildren.push(
        new Paragraph({
          spacing: { before: 300, after: 100 },
          children: [
            new TextRun({
              text: `CHAPITRE ${chap.chapterNumber || (cIdx + 1)}`.toUpperCase(),
              bold: true,
              size: 20,
              color: '4F46E5',
            }),
          ],
        })
      );

      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: chap.title,
              bold: true,
              size: 36,
              color: '0F172A',
            }),
          ],
        })
      );

      if (chap.subtitle) {
        docChildren.push(
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: chap.subtitle,
                italics: true,
                size: 22,
                color: '64748B',
              }),
            ],
          })
        );
      }

      // Chapter paragraphs
      const paragraphs = (chap.content || '').split('\n\n');
      paragraphs.forEach((pText) => {
        const trimmed = pText.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('## ')) {
          docChildren.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 },
              children: [
                new TextRun({
                  text: trimmed.replace('## ', ''),
                  bold: true,
                  size: 26,
                  color: '1E293B',
                }),
              ],
            })
          );
        } else if (trimmed.startsWith('### ')) {
          docChildren.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 },
              children: [
                new TextRun({
                  text: trimmed.replace('### ', ''),
                  bold: true,
                  size: 22,
                  color: '334155',
                }),
              ],
            })
          );
        } else if (trimmed.startsWith('>')) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 200, after: 200 },
              indent: { left: 400, right: 400 },
              children: [
                new TextRun({
                  text: trimmed.replace(/^>\s*/, '').replace(/[*_]/g, ''),
                  italics: true,
                  size: 20,
                  color: '4338CA',
                }),
              ],
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              spacing: { after: 150 },
              children: [
                new TextRun({
                  text: trimmed,
                  size: 22,
                  color: '1E293B',
                }),
              ],
            })
          );
        }
      });

      // Key Takeaways
      if (chap.keyTakeaways && chap.keyTakeaways.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: "Points Clés à Retenir :",
                bold: true,
                size: 22,
                color: 'B45309',
              }),
            ],
          })
        );
        chap.keyTakeaways.forEach((pt) => {
          docChildren.push(
            new Paragraph({
              spacing: { after: 60 },
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: pt,
                  size: 20,
                  color: '451A03',
                }),
              ],
            })
          );
        });
      }
    });
  }

  // 5. BACK COVER (Final Page)
  docChildren.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 300 },
      children: [
        new TextRun({
          text: "QUATRIÈME DE COUVERTURE",
          bold: true,
          size: 24,
          color: '4F46E5',
        }),
      ],
    })
  );

  if (backProposal?.synopsis) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({
            text: "Résumé :",
            bold: true,
            size: 22,
            color: '0F172A',
          }),
        ],
      })
    );
    docChildren.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: backProposal.synopsis,
            size: 20,
            color: '334155',
          }),
        ],
      })
    );
  }

  if (backProposal?.authorBio) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: `À propos de l'auteur (${ebookData.author}) :`,
            bold: true,
            size: 22,
            color: '0F172A',
          }),
        ],
      })
    );
    docChildren.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: backProposal.authorBio,
            size: 20,
            color: '475569',
          }),
        ],
      })
    );
  }

  if (backProposal?.quoteOrCallToAction) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 300 },
        children: [
          new TextRun({
            text: backProposal.quoteOrCallToAction,
            italics: true,
            bold: true,
            size: 22,
            color: '4338CA',
          }),
        ],
      })
    );
  }

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [
        new TextRun({
          text: `Dokya AI Publishing • ISBN ${backProposal?.isbnNumber || '978-2-84000-123-4'}`,
          size: 16,
          color: '94A3B8',
        }),
      ],
    })
  );

  // Generate Docx Document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Ebook_${(ebookData.title || 'Livre').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

  const downloadAnchor = document.createElement('a');
  const url = URL.createObjectURL(blob);
  downloadAnchor.href = url;
  downloadAnchor.download = fileName;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

