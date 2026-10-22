import React from 'react';
import { RateQuote, LaneInput, AccessorialsInput } from '../engine/types';

interface RateConfirmationModalProps {
  lane: LaneInput;
  quote: RateQuote;
  acc: AccessorialsInput;
  isOpen: boolean;
  onClose: () => void;
}

export const RateConfirmationModal: React.FC<RateConfirmationModalProps> = ({
  lane,
  quote,
  acc,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const rateConfNumber = `RC-${Date.now().toString().slice(-6)}`;
  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div
        className="rate-conf-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#0f172a',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '32px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }} className="no-print">
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>📄 Official Carrier-Broker Rate Confirmation Agreement</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Conforms to standard TIA / FMCSA commercial freight contracting standards</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.print()}
              style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
            >
              🖨️ Print Agreement
            </button>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Contract Sheet */}
        <div style={{ border: '1px solid #cbd5e1', padding: '24px', borderRadius: '6px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                FREIGHT RATE CONFIRMATION
              </h1>
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>APEX FREIGHT LOGISTICS BROKERAGE · MC# 948102 · DOT# 389211</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0284c7' }}>CONFIRMATION #{rateConfNumber}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>DATE: {todayStr}</div>
            </div>
          </div>

          {/* Lane Itinerary & Schedule */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '12px', borderRadius: '4px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>ORIGIN / SHIPPER:</span>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{lane.originCity}, {lane.originState}</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Standard Shipping Dock Bay 4 · Scheduled Pickup: 08:00 EST</div>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>DESTINATION / CONSIGNEE:</span>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{lane.destCity}, {lane.destState}</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Receiving Logistics Hub Gate C · Scheduled Delivery: 16:00 CST</div>
            </div>
          </div>

          {/* Equipment & Miles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px', fontSize: '11px' }}>
            <div style={{ border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
              <span style={{ color: '#64748b', display: 'block' }}>EQUIPMENT TYPE:</span>
              <strong>{lane.equipmentCategory.replace('_', ' ').toUpperCase()}</strong>
            </div>
            <div style={{ border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
              <span style={{ color: '#64748b', display: 'block' }}>LOADED DISTANCE:</span>
              <strong>{lane.loadedMiles.toLocaleString()} Miles</strong>
            </div>
            <div style={{ border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
              <span style={{ color: '#64748b', display: 'block' }}>EMPTY DEADHEAD:</span>
              <strong>{lane.deadheadMiles.toLocaleString()} Miles</strong>
            </div>
            <div style={{ border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
              <span style={{ color: '#64748b', display: 'block' }}>TOTAL RECOGNIZED:</span>
              <strong>{quote.totalMiles.toLocaleString()} Miles</strong>
            </div>
          </div>

          {/* Cost Waterfall & Rates Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>PAYMENT ITEM / CHARGE CODE</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>RATE / BASIS</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>AMOUNT (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px' }}>Base Linehaul Freight Charge</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>${(quote.recommendedLinehaulRate / lane.loadedMiles).toFixed(2)} / loaded mi</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>${quote.recommendedLinehaulRate.toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px' }}>DOE Weekly Diesel Fuel Surcharge (FSC)</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>${quote.fuelSurchargePerMile.toFixed(3)} / mi</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>${quote.totalFuelSurcharge.toFixed(2)}</td>
              </tr>
              {acc.detentionHours > 0 && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>Detention Surcharge ({acc.detentionHours} billable hrs)</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>$75.00 / hr</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>${(acc.detentionHours * 75).toFixed(2)}</td>
                </tr>
              )}
              {acc.reeferContinuousTempControl && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>Reefer Continuous Temp Monitoring Fee</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>Flat Reefer Accessorial</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>$150.00</td>
                </tr>
              )}
              {acc.isHazmat && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>DOT Hazmat Compliance & Placarding Surcharge</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>Hazmat Adder</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>$250.00</td>
                </tr>
              )}
              <tr style={{ background: '#f8fafc', fontWeight: 800, fontSize: '13px' }}>
                <td style={{ padding: '10px 8px' }}>TOTAL AGREED CARRIER COMPENSATION</td>
                <td style={{ textAlign: 'right', padding: '10px 8px' }}>Effective RPM: ${quote.recommendedRatePerMile.toFixed(2)}/mi</td>
                <td style={{ textAlign: 'right', padding: '10px 8px', color: '#0284c7', fontSize: '15px' }}>${quote.recommendedTotalRate.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Legal Terms */}
          <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px', background: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
            <strong>TERMS & CONDITIONS:</strong> Carrier agrees to furnish equipment capable of legally transporting cargo described. Carrier certifies active commercial auto liability insurance of at least $1,000,000 and cargo insurance of at least $100,000. Free detention time is 2 hours at origin and destination. Double-brokering or unauthorized re-brokering is strictly prohibited and results in complete forfeiture of carrier pay.
          </div>

          {/* Signature Blocks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', paddingTop: '12px', borderTop: '1px solid #cbd5e1' }}>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', height: '36px', marginBottom: '4px' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>AUTHORIZED BROKER DISPATCH REPRESENTATIVE</span>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', height: '36px', marginBottom: '4px' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>AUTHORIZED CARRIER / OWNER-OPERATOR SIGNATURE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
