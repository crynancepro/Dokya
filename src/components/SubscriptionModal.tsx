import React from 'react';
import { DokyaPaymentModal } from './DokyaPaymentModal';
import { UserSubscription, TransactionRecord } from '../types';

export interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: 'weekly' | 'monthly' | 'annual';
  planTitle: string;
  price: number;
  userBalance: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  isUserVip?: boolean;
  onSuccess: (sub: UserSubscription, method: 'wallet' | 'mobile_money' | 'card') => void;
  onOpenRecharge: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  planId,
  planTitle,
  price,
  userBalance,
  userId,
  userEmail,
  userName,
  isUserVip,
  onSuccess,
  onOpenRecharge
}) => {
  return (
    <DokyaPaymentModal
      isOpen={isOpen}
      onClose={onClose}
      mode="subscription"
      planId={planId}
      planTitle={planTitle}
      planPrice={price}
      userBalance={userBalance}
      userId={userId}
      userEmail={userEmail}
      userName={userName}
      isUserVip={isUserVip}
      onSubscriptionSuccess={(sub, method) => onSuccess(sub, method)}
      onOpenRechargeModal={onOpenRecharge}
    />
  );
};
