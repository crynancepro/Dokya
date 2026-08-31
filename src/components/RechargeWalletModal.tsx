import React from 'react';
import { DokyaPaymentModal } from './DokyaPaymentModal';
import { TransactionRecord } from '../types';

export interface RechargeWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  userBalance?: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  initialAmount?: number;
  onRechargeSuccess?: (addedAmount: number, transaction: TransactionRecord) => void;
  onSuccess?: (addedAmount: number, transaction?: TransactionRecord) => void;
}

export const RechargeWalletModal: React.FC<RechargeWalletModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  userBalance,
  userId,
  userEmail,
  userName,
  initialAmount = 3000,
  onRechargeSuccess,
  onSuccess
}) => {
  const effectiveBalance = currentBalance !== undefined ? currentBalance : (userBalance || 0);

  const handleSuccess = (addedAmount: number, tx?: TransactionRecord) => {
    if (tx) {
      if (onRechargeSuccess) onRechargeSuccess(addedAmount, tx);
      if (onSuccess) onSuccess(addedAmount, tx);
    }
  };

  return (
    <DokyaPaymentModal
      isOpen={isOpen}
      onClose={onClose}
      mode="recharge"
      initialRechargeAmount={initialAmount}
      userBalance={effectiveBalance}
      userId={userId}
      userEmail={userEmail}
      userName={userName}
      onRechargeSuccess={handleSuccess}
    />
  );
};
