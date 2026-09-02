import React from 'react';
import { DokyaPaymentModal } from './DokyaPaymentModal';
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
  isAlreadyPaid = false,
  onPaymentSuccess,
  onOpenRechargeModal,
  onDownloadPDF,
  onDownloadDocx,
  onOpenInterviewPrep
}) => {
  return (
    <DokyaPaymentModal
      isOpen={isOpen}
      onClose={onClose}
      mode="document"
      documentTitle={documentTitle}
      documentTypeLabel={documentTypeLabel}
      targetDocId={targetDocId}
      price={price}
      isAlreadyPaid={isAlreadyPaid}
      userBalance={userBalance}
      userId={userId}
      userEmail={userEmail}
      userName={userName}
      onPaymentSuccess={onPaymentSuccess}
      onOpenRechargeModal={onOpenRechargeModal}
      onDownloadPDF={onDownloadPDF}
      onDownloadDocx={onDownloadDocx}
      onOpenInterviewPrep={onOpenInterviewPrep}
    />
  );
};
