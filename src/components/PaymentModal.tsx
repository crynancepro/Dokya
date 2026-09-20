import React from 'react';
import { PaywallModal } from './PaywallModal';
import { TransactionRecord } from '../types';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentTypeLabel: string;
  targetDocId?: string;
  price?: number;
  userBalance: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  isAlreadyPaid?: boolean;
  onPaymentSuccess: (method: 'wallet' | 'mobile_money' | 'free', transaction?: TransactionRecord) => void;
  onOpenRechargeModal: () => void;
  onDownloadPDF?: () => void;
  onDownloadDocx?: () => void;
  onOpenInterviewPrep?: () => void;
  documentData?: any;
  contentData?: any;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentTypeLabel,
  targetDocId,
  price,
  userBalance = 0,
  userId,
  userEmail,
  userName,
  onPaymentSuccess,
  onOpenRechargeModal,
  onDownloadPDF,
  onDownloadDocx,
  documentData,
  contentData
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
      userEmail={userEmail}
      userName={userName}
      onUnlocked={() => {
        onPaymentSuccess('wallet');
      }}
      onOpenRechargeModal={onOpenRechargeModal}
      onDownloadAction={(format) => {
        if (format === 'docx' && onDownloadDocx) onDownloadDocx();
        else if (onDownloadPDF) onDownloadPDF();
      }}
      documentData={documentData}
      contentData={contentData}
    />
  );
};
