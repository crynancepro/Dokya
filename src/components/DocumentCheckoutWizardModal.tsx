import React from 'react';
import { DokyaPaymentModal } from './DokyaPaymentModal';
import { CVFormData, AIOptimizedData, TransactionRecord } from '../types';

export interface DocumentCheckoutWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentTypeLabel: string;
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
  price,
  userBalance = 0,
  userId,
  onDownloadPDF,
  onDownloadDocx,
  onSuccessTransaction,
  onOpenRechargeModal
}) => {
  return (
    <DokyaPaymentModal
      isOpen={isOpen}
      onClose={onClose}
      mode="document"
      documentTitle={documentTitle}
      documentTypeLabel={documentTypeLabel}
      price={price}
      userBalance={userBalance}
      userId={userId}
      onPaymentSuccess={(_method, tx) => {
        if (tx && onSuccessTransaction) {
          onSuccessTransaction(tx.newBalance ?? userBalance, tx);
        }
      }}
      onOpenRechargeModal={onOpenRechargeModal}
      onDownloadPDF={onDownloadPDF}
      onDownloadDocx={onDownloadDocx}
    />
  );
};
