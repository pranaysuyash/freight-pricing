import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RateQuote, LaneInput, AccessorialsInput } from '../engine/types';
import './rate-estimate.css';

interface RateConfirmationModalProps {
  lane: LaneInput;
  quote: RateQuote;
  acc: AccessorialsInput;
  isOpen: boolean;
  onClose: () => void;
}

const money = (value: number) => `$${value.toFixed(2)}`;

/** A fresh mount owns one immutable estimate snapshot and one draft identifier. */
function FreightEstimateDialog({ lane, quote, acc, onClose }: Omit<RateConfirmationModalProps, 'isOpen'>) {
  const [draft] = useState(() => ({
    number: `EST-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...structuredClone({ lane, quote, acc }),
  }));
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const latestClose = useRef(onClose);
  latestClose.current = onClose;
  const titleId = useId();
  const scopeId = useId();
  const q = draft.quote;
  const route = draft.lane;
  const inputs = draft.acc;
  const inputRows = [
    ['Detention beyond assumed free time', `${inputs.detentionHours} hours`],
    ['Layover', `${inputs.layoverDays} days`],
    ['Lumper fee input', money(inputs.lumperFee)],
    ['Additional delivery stops', String(inputs.extraStopsCount)],
    ['Hazmat adder requested', inputs.isHazmat ? 'Yes' : 'No'],
    ['Tarping requested', inputs.requiresTarp ? 'Yes' : 'No'],
    ['Continuous reefer temperature control requested', inputs.reeferContinuousTempControl ? 'Yes' : 'No'],
  ];

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    title.current?.focus();
    return () => {
      if (node?.open) node.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(<dialog
    ref={dialog}
    className="freight-estimate-dialog"
    aria-labelledby={titleId}
    aria-describedby={scopeId}
    onCancel={event => { event.preventDefault(); latestClose.current(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) latestClose.current();
    }}
  >
    <div className="freight-estimate-document">
      <div className="freight-estimate-toolbar">
        <p>Review the draft, then print or save as PDF.</p>
        <div><button type="button" onClick={() => window.print()}>Print draft estimate</button><button type="button" onClick={onClose}>Close</button></div>
      </div>
      <header className="freight-estimate-header">
        <div><h2 id={titleId} ref={title} tabIndex={-1}>Draft freight estimate</h2><p id={scopeId}>Calculator snapshot for discussion. Commercial acceptance, carrier authority, insurance and appointment confirmation are not established by this document.</p></div>
        <div className="freight-estimate-identity"><strong>Draft #{draft.number}</strong><time dateTime={draft.createdAt}>{draft.createdAt}</time><small>Values remain fixed while this draft is open. Reopen to capture current calculator inputs.</small></div>
      </header>

      <section aria-label="Parties and lane" className="freight-estimate-lane">
        <div><h3>Origin / shipper</h3><strong>{route.originCity || 'Not declared'}, {route.originState || 'Not declared'}</strong><p>Shipper: Not declared<br />Pickup dock: Not declared<br />Pickup appointment and time zone: Not declared</p></div>
        <div><h3>Destination / consignee</h3><strong>{route.destCity || 'Not declared'}, {route.destState || 'Not declared'}</strong><p>Consignee: Not declared<br />Receiving dock: Not declared<br />Delivery appointment and time zone: Not declared</p></div>
        <div><h3>Brokerage</h3><p>Brokerage identity: Not declared<br />MC number: Not declared<br />DOT number: Not declared</p></div>
        <div><h3>Carrier</h3><p>Carrier identity: Not declared<br />MC number: Not declared<br />DOT number: Not declared</p></div>
      </section>

      <dl className="freight-estimate-metrics">
        <div><dt>Equipment type</dt><dd>{route.equipmentCategory.replaceAll('_', ' ')}</dd></div>
        <div><dt>Loaded distance</dt><dd>{route.loadedMiles.toLocaleString()} miles</dd></div>
        <div><dt>Empty deadhead</dt><dd>{route.deadheadMiles.toLocaleString()} miles</dd></div>
        <div><dt>Total distance</dt><dd>{q.totalMiles.toLocaleString()} miles</dd></div>
      </dl>

      <h3>Itemized estimate</h3>
      <div className="freight-estimate-table-wrap"><table>
        <thead><tr><th scope="col">Charge item</th><th scope="col">Rate / basis</th><th scope="col">Amount (USD)</th></tr></thead>
        <tbody>
          <tr><td>Base linehaul freight charge</td><td>{route.loadedMiles > 0 ? `${money(q.recommendedLinehaulRate / route.loadedMiles)} / loaded mile` : 'No positive loaded distance declared'}</td><td>{money(q.recommendedLinehaulRate)}</td></tr>
          <tr><td>Calculated diesel fuel surcharge</td><td>${q.fuelSurchargePerMile.toFixed(3)} / loaded mile</td><td>{money(q.totalFuelSurcharge)}</td></tr>
          {q.accessorialItems.map((item, index) => <tr key={`${item.label}-${index}`}><td>{item.label}</td><td>{'description' in item && typeof item.description === 'string' ? item.description : 'Calculated from declared accessorial inputs'}</td><td>{money(item.amount)}</td></tr>)}
          <tr className="freight-estimate-total"><th scope="row">Total draft estimate</th><td>Effective loaded RPM: {money(q.recommendedRatePerMile)} / mile</td><td>{money(q.recommendedTotalRate)}</td></tr>
        </tbody>
      </table></div>
      <p className="freight-estimate-note">Fuel and accessorial amounts are calculator outputs from the opened snapshot. Their inclusion does not confirm a service was performed, an index is current or a charge was accepted.</p>

      <details className="freight-estimate-inputs"><summary>Complete accessorial input context</summary><dl>{inputRows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></details>

      <section className="freight-estimate-terms" aria-label="Draft terms for discussion">
        <h3>Draft terms and assumptions for discussion</h3>
        <p>Equipment suitability and legal cargo transport require confirmation by the responsible parties. Discussion values for commercial auto liability are $1,000,000 and cargo insurance $100,000. These values are draft context; verified coverage and agreed insurance requirements are not recorded.</p>
        <p>The calculator treats declared detention hours as billable hours beyond an assumed two-hour free period. Origin and destination free time and actual detention charges require agreement. The inputs above show the hours used in this estimate.</p>
        <p>Restrictions on double-brokering or unauthorized re-brokering and any proposed effect on compensation require separately reviewed terms. This draft records no agreement, certification, signature or forfeiture of carrier pay.</p>
      </section>

      <section className="freight-estimate-signatures" aria-label="Review context">
        <div><span>Broker representative: Not declared</span><span>Review / acceptance status: Not recorded in this calculator draft</span></div>
        <div><span>Carrier representative: Not declared</span><span>Signature / acceptance evidence: Not recorded in this calculator draft</span></div>
      </section>
    </div>
  </dialog>, document.body);
}

export function RateConfirmationModal(props: RateConfirmationModalProps) {
  return props.isOpen ? <FreightEstimateDialog {...props} /> : null;
}
