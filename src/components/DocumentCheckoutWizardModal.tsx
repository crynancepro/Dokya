import React from 'react';
import { PaywallModal } from './PaywallModal';
import { CVFormData, AIOptimizedData, TransactionRecord } from '../types';

export interface DocumentCheckoutWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentTypeLabel: string;
  targetDocId?: string;
  formData?: CVFormData;
  aiData?: AIOptimizedData | null;
  price?: number;
  userBalance: number;
  userId?: string;
  onDownloadPDF?: () => Promise<void> | void;
  onDownloadDocx?: () => Promise<void> | void;
  onSuccessTransaction?: (newBalance: number, tx: TransactionRecord) => void;
  onOpenRechargeModal?: () => void;
}

export const DocumentCheckoutWizardModal: React.FC<DocumentCheckoutWizardModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentTypeLabel,
  targetDocId,
  price,
  userBalance = 0,
  userId,
  onDownloadPDF,
  onDownloadDocx,
  onSuccessTransaction,
  onOpenRechargeModal
}) => {
  return (
    <PaywallModal
      isOpen={isOpen}
      onClose={onClose}
      documentTitle={documentTitle}
      documentTypeLabel={documentTypeLabel}
      targetDocId={targetDocId}
      documentPrice={price}
      userBalance={userBalance}
      userId={userId}
      onUnlocked={() => {
        if (onSuccessTransaction) {
          onSuccessTransaction(Math.max(0, userBalance - (price || 1000)), {} as TransactionRecord);
        }
      }}
      onOpenRechargeModal={onOpenRechargeModal}
      onDownloadAction={(format) => {
        if (format === 'docx' && onDownloadDocx) onDownloadDocx();
        else if (onDownloadPDF) onDownloadPDF();
      }}
    />
  );
};
