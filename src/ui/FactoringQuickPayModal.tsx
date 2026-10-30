import React, { useState, useMemo } from 'react';
import {
  calculateSettlementPayable,
  SETTLEMENT_CONFIGS,
  SettlementPaymentTerm,
} from '../engine/factoringQuickPay';

interface FactoringQuickPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGrossPay: number;
}

export const FactoringQuickPayModal: React.FC<FactoringQuickPayModalProps> = ({
  isOpen,
  onClose,
  initialGrossPay,
}) => {
  const [grossPay, setGrossPay] = useState<number>(initialGrossPay || 2850);
  const [selectedTerm, setSelectedTerm] = useState<SettlementPaymentTerm>('quickpay_2day');
  const [factorName, setFactorName] = useState<string>('Triumph Financial Services, LLC');
  const [customDiscountPct, setCustomDiscountPct] = useState<number | undefined>(undefined);

  const settlement = useMemo(() => {
    return calculateSettlementPayable({
      grossCarrierPayDollars: grossPay,
      selectedTerm,
      factorName,
      customDiscountPct,
    });
  }, [grossPay, selectedTerm, factorName, customDiscountPct]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="factoring-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '20px',
      }}
    >
      <div
        className="modal-container"
        style={{
          background: '#ffffff',
          borderRadius: 12,
          maxWidth: 920,
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 id="factoring-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Carrier QuickPay, Factoring &amp; Settlement Terms
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 9999,
                  background: settlement.brokerRetainedProfitDollars > 0 ? '#dcfce7' : '#e0f2fe',
                  color: settlement.brokerRetainedProfitDollars > 0 ? '#15803d' : '#0369a1',
                  border: `1px solid ${settlement.brokerRetainedProfitDollars > 0 ? '#86efac' : '#bae6fd'}`,
                }}
              >
                {settlement.brokerRetainedProfitDollars > 0
                  ? `+$${settlement.brokerRetainedProfitDollars.toFixed(2)} BROKER QUICKPAY SPREAD`
                  : settlement.config.label}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              Working capital float optimization, early-payment discount capture, and UCC Article 9 Notice of Assignment (NOA).
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Key Metric Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Gross Carrier Pay</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                ${settlement.grossCarrierPayDollars.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Contract Linehaul + FSC</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Net Immediate Payout</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>
                ${settlement.netImmediatePayoutDollars.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 11, color: '#16a34a' }}>
                {settlement.payoutDays === 0 ? 'Same Day' : `${settlement.payoutDays} Day(s) Payout`}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Discount / Fee</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: settlement.discountDeductionDollars > 0 ? '#d97706' : '#64748b' }}>
                ${settlement.discountDeductionDollars.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Rate: {settlement.effectiveDiscountPct}%</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Float Savings</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0284c7' }}>
                +${settlement.workingCapitalFloatSavingsDollars.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>@ 10% APR Cost of Capital</div>
            </div>
          </div>

          {/* Payment Terms Selector Cards */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Select Settlement Term Structure:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {(Object.keys(SETTLEMENT_CONFIGS) as SettlementPaymentTerm[]).map((term) => {
                const cfg = SETTLEMENT_CONFIGS[term];
                const isSelected = selectedTerm === term;
                return (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setSelectedTerm(term);
                      setCustomDiscountPct(undefined);
                    }}
                    style={{
                      border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '12px 14px',
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#0369a1' : '#1e293b', marginBottom: 4 }}>
                      {cfg.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, marginBottom: 6 }}>
                      {cfg.description}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? '#0284c7' : '#475569' }}>
                      Payout: {cfg.payoutDays === 0 ? 'Same Day' : `${cfg.payoutDays} Days`} · Fee: {cfg.discountPct}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Factor Notice of Assignment Banner if applicable */}
          {settlement.requiresNoaRemittance && (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>
                ⚠ STATUTORY NOTICE OF ASSIGNMENT (NOA) MANDATORY:
              </div>
              <div style={{ fontSize: 11, color: '#b91c1c', lineHeight: 1.4 }}>
                {settlement.factorNoticeOfAssignment}
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#7f1d1d', display: 'block', marginBottom: 2 }}>
                  Factoring Company Entity Name:
                </label>
                <input
                  type="text"
                  value={factorName}
                  onChange={(e) => setFactorName(e.target.value)}
                  style={{ width: '100%', padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #fca5a5' }}
                />
              </div>
            </div>
          )}

          {/* Interactive Parameters */}
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
              Adjust Gross Settlement Pay &amp; Custom Fee Override
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Gross Carrier Payable Amount ($):
                </label>
                <input
                  type="number"
                  min={100}
                  max={50000}
                  step={50}
                  value={grossPay}
                  onChange={(e) => setGrossPay(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Custom Discount Rate Override (%):
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  placeholder={`Default (${settlement.config.discountPct}%)`}
                  value={customDiscountPct ?? ''}
                  onChange={(e) => setCustomDiscountPct(e.target.value ? Number(e.target.value) : undefined)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {settlement.settlementSummary}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
