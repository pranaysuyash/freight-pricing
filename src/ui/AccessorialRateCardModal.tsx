import React, { useState, useMemo } from 'react';
import { useModalDialog } from './useModalDialog';
import { accessorialDialogDraft, evaluateAccessorialDialog } from '../engine/accessorials';
import type { AccessorialAuditResult } from '../engine/accessorialRateCard';
import type { AccessorialsInput } from '../engine/types';

interface AccessorialRateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAccessorials: (audit: AccessorialAuditResult) => void;
  initialAccessorials: AccessorialsInput;
}

export const AccessorialRateCardModal: React.FC<AccessorialRateCardModalProps> = ({
  isOpen,
  onClose,
  onApplyAccessorials,
  initialAccessorials,
}) => {
  const [initial] = useState(() => accessorialDialogDraft(initialAccessorials));
  const [rateCard] = useState(initial.rateCard);
  const [detentionMode, setDetentionMode] = useState(initial.detention.mode);
  const [dwellHours, setDwellHours] = useState(initial.detention.mode === 'dwell' ? initial.detention.hours : 0);
  const [billableHours, setBillableHours] = useState(initial.detention.mode === 'billable' ? initial.detention.hours : 0);
  const detentionHours = detentionMode === 'dwell' ? dwellHours : billableHours;
  const [tonu, setTonu] = useState(initial.tonu);
  const [layoverDays, setLayoverDays] = useState(initial.layoverDays);
  const [extraStops, setExtraStops] = useState(initial.extraStops);
  const [liftgate, setLiftgate] = useState(initial.liftgate);
  const [insideDelivery, setInsideDelivery] = useState(initial.insideDelivery);
  const [isHazmat, setIsHazmat] = useState(initial.isHazmat);
  const dialog = useModalDialog(isOpen);

  const auditResult: AccessorialAuditResult = useMemo(() => {
    return evaluateAccessorialDialog({ rateCard, detention: { mode: detentionMode, hours: detentionHours },
      tonu, layoverDays, extraStops, liftgate, insideDelivery, isHazmat });
  }, [detentionHours, detentionMode, tonu, layoverDays, extraStops, liftgate, insideDelivery, isHazmat, rateCard]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyAccessorials(auditResult);
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="modal-backdrop"
      aria-modal="true"
      aria-labelledby="accessorial-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', margin: 0, border: 0, boxSizing: 'border-box',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          maxWidth: 620,
          width: '100%',
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #cbd5e1',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 id="accessorial-modal-title" style={{ fontSize: 16, margin: 0, fontWeight: 700, color: '#0f172a' }}>
              Contractual Accessorial Rate Schedule &amp; Claims
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Review the current rates, detention and special handling before applying.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#64748b',
              minWidth: 44,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '65vh', overflowY: 'auto' }}>
          {/* Facility Dwell & Pro-Rated Detention */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label htmlFor="dwell-hours-input" style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                {detentionMode === 'dwell' ? 'Facility Dwell Time (Hours):' : 'Billable Detention (Hours):'}
              </label>
              <span style={{ fontSize: 12, fontWeight: 700, color: auditResult.billableDetentionHours > 0 ? '#b91c1c' : '#15803d' }}>
                {auditResult.billableDetentionHours > 0 ? `${auditResult.billableDetentionHours}h Billable Detention ($${(auditResult.billableDetentionHours * rateCard.detentionHourlyRate).toFixed(2)})` : 'No billable detention'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                id="dwell-hours-input"
                type="number"
                min={0}
                step="any"
                value={detentionHours}
                onChange={(e) => (detentionMode === 'dwell' ? setDwellHours : setBillableHours)(Math.max(0, Number(e.target.value)))}
                style={{ padding: '8px 12px', fontSize: 14, fontWeight: 700, borderRadius: 6, border: '1px solid #cbd5e1', width: 120 }}
                aria-label={detentionMode === 'dwell' ? 'Total facility dwell hours' : 'Billable detention hours'}
              />
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {detentionMode === 'dwell' ? `${initial.detention.mode === 'billable' ? 'New calculation assumptions' : 'Rule'}: ${rateCard.detentionFreeHours} hours free, billed in ${rateCard.detentionIncrementMinutes}-minute increments @ $${rateCard.detentionHourlyRate}/hr` : `Billable hours @ $${rateCard.detentionHourlyRate}/hr; ${initial.detention.mode === 'billable' ? 'original dwell and rounding terms are unavailable' : 'dwell and rounding are not used for this calculation'}.`}
              </span>
            </div>
            <button type="button" onClick={() => {
              if (detentionMode === 'dwell') { setBillableHours(auditResult.billableDetentionHours); setDetentionMode('billable'); }
              else setDetentionMode('dwell');
            }} style={{ marginTop: 8, minHeight: 36 }}>
              {detentionMode === 'dwell' ? 'Enter billable hours directly' : 'Calculate from total dwell'}
            </button>
          </div>

          {/* Operational Exception Adders */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: tonu ? '#fef2f2' : '#ffffff' }}>
              <input
                type="checkbox"
                checked={tonu}
                onChange={(e) => setTonu(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#dc2626' }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>TONU Flat Fee (+${rateCard.tonuFlatFee})</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Truck Order Not Used (Shipper cancelled)</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: liftgate ? '#f0f9ff' : '#ffffff' }}>
              <input
                type="checkbox"
                checked={liftgate}
                onChange={(e) => setLiftgate(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#0284c7' }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Hydraulic Liftgate (+${rateCard.liftgateFee})</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>No dock loading facility at stop</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: insideDelivery ? '#f0f9ff' : '#ffffff' }}>
              <input
                type="checkbox"
                checked={insideDelivery}
                onChange={(e) => setInsideDelivery(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#0284c7' }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Inside Delivery (+${rateCard.insideDeliveryFee})</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Driver unpacks/moves past threshold</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: isHazmat ? '#fffbeb' : '#ffffff' }}>
              <input
                type="checkbox"
                checked={isHazmat}
                onChange={(e) => setIsHazmat(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#d97706' }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Hazmat Surcharge (+${rateCard.hazmatSurcharge})</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Placarded hazardous materials</div>
              </div>
            </label>
          </div>

          {/* Stepper Inputs for Layover and Extra Stops */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
              <label htmlFor="layover-days-input" style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                Layover Days (${rateCard.layoverDailyRate}/day):
              </label>
              <input
                id="layover-days-input"
                type="number"
                min={0}
                max={5}
                value={layoverDays}
                onChange={(e) => setLayoverDays(Math.max(0, Number(e.target.value)))}
                style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
              <label htmlFor="extra-stops-input" style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                Intermediate Stops (${rateCard.stopOffRate}/stop):
              </label>
              <input
                id="extra-stops-input"
                type="number"
                min={0}
                max={10}
                value={extraStops}
                onChange={(e) => setExtraStops(Math.max(0, Number(e.target.value)))}
                style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          {/* Generated Claim Summary */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Evaluated Accessorial Line Items ({auditResult.items.length})
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0284c7' }}>
                Total: ${auditResult.totalAmount.toFixed(2)}
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#475569', margin: '0 0 8px' }}>Line values are rounded for display; the total uses unrounded quantities and rates.</p>
            {auditResult.items.length === 0 ? (
              <p style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', margin: 0 }}>
                No billable accessorial items triggered.
              </p>
            ) : (
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Explanation</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {auditResult.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{item.label}</td>
                      <td style={{ padding: '6px 8px', color: '#64748b' }}>{item.explanation}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>${item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 20px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Apply Accessorials (${auditResult.totalAmount.toFixed(2)})
          </button>
        </div>
      </div>
    </dialog>
  );
};
