import React, { useMemo } from 'react';
import {
  evaluateBrokerMargin,
  BrokerMarginReport,
} from '../engine/brokerMargin';
import { IconAlertTriangle } from './icons';

interface BrokerMarginCardProps {
  shipperSellRate: number;
  carrierBuyRate: number;
  approvedAccessorialsBilled: number;
  approvedAccessorialsPaid: number;
  onShipperSellRateChange?: (newRate: number) => void;
}

export const BrokerMarginCard: React.FC<BrokerMarginCardProps> = ({
  shipperSellRate,
  carrierBuyRate,
  approvedAccessorialsBilled,
  approvedAccessorialsPaid,
  onShipperSellRateChange,
}) => {
  const marginReport: BrokerMarginReport = useMemo(() => {
    return evaluateBrokerMargin({
      shipperSellRate,
      carrierBuyRate,
      approvedAccessorialsBilled,
      approvedAccessorialsPaid,
      agentCommissionRatePct: 20,
      minMarginThresholdPct: 12.0,
    });
  }, [shipperSellRate, carrierBuyRate, approvedAccessorialsBilled, approvedAccessorialsPaid]);

  const getStatusColor = () => {
    switch (marginReport.status) {
      case 'UNDERWATER_NEGATIVE':
        return '#f87171';
      case 'LOW_MARGIN_WARNING':
        return '#fbbf24';
      case 'HIGH_YIELD':
        return '#4ade80';
      case 'HEALTHY_TARGET':
      default:
        return '#38bdf8';
    }
  };

  const getStatusBg = () => {
    switch (marginReport.status) {
      case 'UNDERWATER_NEGATIVE':
        return 'rgba(239, 68, 68, 0.14)';
      case 'LOW_MARGIN_WARNING':
        return 'rgba(245, 158, 11, 0.14)';
      case 'HIGH_YIELD':
        return 'rgba(34, 197, 94, 0.14)';
      case 'HEALTHY_TARGET':
      default:
        return 'rgba(56, 189, 248, 0.14)';
    }
  };

  const getStatusBorder = () => {
    switch (marginReport.status) {
      case 'UNDERWATER_NEGATIVE':
        return 'rgba(248, 113, 113, 0.4)';
      case 'LOW_MARGIN_WARNING':
        return 'rgba(251, 191, 36, 0.4)';
      case 'HIGH_YIELD':
        return 'rgba(74, 222, 128, 0.4)';
      case 'HEALTHY_TARGET':
      default:
        return 'rgba(56, 189, 248, 0.4)';
    }
  };

  return (
    <section className="panel" aria-label="Brokerage Margin & Spread Control" style={{ marginTop: 16 }}>
      <div className="panel-h">
        <b>5. Brokerage Margin &amp; Commission Ledger</b>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              background: getStatusBg(),
              color: getStatusColor(),
              border: `1px solid ${getStatusBorder()}`,
            }}
          >
            {marginReport.status === 'UNDERWATER_NEGATIVE'
              ? 'UNDERWATER LOSS'
              : marginReport.status === 'LOW_MARGIN_WARNING'
              ? 'LOW MARGIN WARNING'
              : marginReport.status === 'HIGH_YIELD'
              ? 'HIGH YIELD'
              : 'TARGET MET'}
          </span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: getStatusColor() }}>
            {marginReport.grossMarginPercent}% Spread
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', background: '#0b1120' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>ILLUSTRATIVE CUSTOMER TOTAL</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '4px 0' }}>
            ${marginReport.totalShipperInvoice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Customer Bill</div>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', background: '#0b1120' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>ILLUSTRATIVE CARRIER TOTAL</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '4px 0' }}>
            ${marginReport.totalCarrierPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Motor Carrier Buy</div>
        </div>

        <div style={{ border: `1px solid ${getStatusBorder()}`, borderRadius: 8, padding: '10px 12px', background: getStatusBg() }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-dim)', fontWeight: 600 }}>GROSS SPREAD</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: getStatusColor(), margin: '4px 0' }}>
            ${marginReport.grossMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: getStatusColor(), fontWeight: 700 }}>
            {marginReport.grossMarginPercent}% of Bill
          </div>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', background: '#0b1120' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>AGENT COMM. (20%)</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '4px 0' }}>
            ${marginReport.agentCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Net: ${marginReport.brokerNetRetained.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {onShipperSellRateChange && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#0b1120', borderRadius: 8, border: '1px solid var(--line)' }}>
          <label htmlFor="shipper-sell-input" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>
            Adjust All-In Customer Rate ($):
          </label>
          <input
            id="shipper-sell-input"
            type="number"
            min={0}
            step={25}
            value={shipperSellRate}
            onChange={(e) => onShipperSellRateChange(Math.max(0, Number(e.target.value)))}
            style={{ padding: '6px 10px', fontSize: 13, fontWeight: 700, borderRadius: 6, border: '1px solid var(--line-strong)', width: 140 }}
            aria-label="Adjust All-In Customer Rate Dollar Amount"
          />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Carrier Buy: ${carrierBuyRate.toFixed(2)} · Minimum 12% margin floor: ${(carrierBuyRate / 0.88).toFixed(2)}
          </span>
        </div>
      )}

      {marginReport.requiresManagementApproval && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 6,
            background: marginReport.status === 'UNDERWATER_NEGATIVE' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(245, 158, 11, 0.14)',
            border: `1px solid ${marginReport.status === 'UNDERWATER_NEGATIVE' ? 'rgba(248, 113, 113, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`,
            color: marginReport.status === 'UNDERWATER_NEGATIVE' ? '#fca5a5' : '#fde68a',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <IconAlertTriangle size={14} />
          <span>{marginReport.alertMessage}</span>
        </div>
      )}
    </section>
  );
};
