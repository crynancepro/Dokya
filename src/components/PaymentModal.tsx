import React from 'react';
import { DokyaPaymentModal } from './DokyaPaymentModal';
import { TransactionRecord } from '../types';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentTypeLabel: string;
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
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentTypeLabel,
  price,
  userBalance = 0,
  userId,
  userEmail,
  userName,
  isAlreadyPaid = false,
  onPaymentSuccess,
  onOpenRechargeModal,
  onDownloadPDF,
  onDownloadDocx
}) => {
  return (
    <DokyaPaymentModal
      isOpen={isOpen}
      onClose={onClose}
      mode="document"
      documentTitle={documentTitle}
      documentTypeLabel={documentTypeLabel}
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
    />
  );
};
