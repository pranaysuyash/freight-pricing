import React, { useMemo } from 'react';
import {
  evaluateBrokerMargin,
  BrokerMarginReport,
} from '../engine/brokerMargin';

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
        return '#dc2626';
      case 'LOW_MARGIN_WARNING':
        return '#d97706';
      case 'HIGH_YIELD':
        return '#15803d';
      case 'HEALTHY_TARGET':
      default:
        return '#0284c7';
    }
  };

  const getStatusBg = () => {
    switch (marginReport.status) {
      case 'UNDERWATER_NEGATIVE':
        return '#fef2f2';
      case 'LOW_MARGIN_WARNING':
        return '#fffbeb';
      case 'HIGH_YIELD':
        return '#f0fdf4';
      case 'HEALTHY_TARGET':
      default:
        return '#f0f9ff';
    }
  };

  const getStatusBorder = () => {
    switch (marginReport.status) {
      case 'UNDERWATER_NEGATIVE':
        return '#fca5a5';
      case 'LOW_MARGIN_WARNING':
        return '#fde68a';
      case 'HIGH_YIELD':
        return '#86efac';
      case 'HEALTHY_TARGET':
      default:
        return '#bae6fd';
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
          <span className="mono" style={{ fontWeight: 800, fontSize: 13, color: getStatusColor() }}>
            {marginReport.grossMarginPercent}% Spread
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', background: '#f8fafc' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>SHIPPER INVOICE</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            ${marginReport.totalShipperInvoice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Customer Bill</div>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', background: '#f8fafc' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>CARRIER PAYABLE</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            ${marginReport.totalCarrierPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Motor Carrier Buy</div>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', background: getStatusBg() }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>GROSS SPREAD</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: getStatusColor(), margin: '4px 0' }}>
            ${marginReport.grossMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: getStatusColor(), fontWeight: 700 }}>
            {marginReport.grossMarginPercent}% of Bill
          </div>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', background: '#f8fafc' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>AGENT COMM. (20%)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            ${marginReport.agentCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Net: ${marginReport.brokerNetRetained.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {onShipperSellRateChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <label htmlFor="shipper-sell-input" style={{ fontSize: 12, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
            Adjust Customer Sell Rate ($):
          </label>
          <input
            id="shipper-sell-input"
            type="number"
            min={0}
            step={25}
            value={shipperSellRate}
            onChange={(e) => onShipperSellRateChange(Math.max(0, Number(e.target.value)))}
            style={{ padding: '6px 10px', fontSize: 13, fontWeight: 700, borderRadius: 6, border: '1px solid #cbd5e1', width: 140 }}
            aria-label="Adjust Customer Sell Rate Dollar Amount"
          />
          <span style={{ fontSize: 11, color: '#64748b' }}>
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
            background: marginReport.status === 'UNDERWATER_NEGATIVE' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${marginReport.status === 'UNDERWATER_NEGATIVE' ? '#fca5a5' : '#fde68a'}`,
            color: marginReport.status === 'UNDERWATER_NEGATIVE' ? '#991b1b' : '#92400e',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ⚠️ {marginReport.alertMessage}
        </div>
      )}
    </section>
  );
};
