import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Dispatch, DispatchItem } from '@/hooks/useDispatches';

export type FontScale = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface Props {
  dispatch: Dispatch;
  items: DispatchItem[];
  fontScale?: FontScale;
  fitToPage?: boolean;
}

// Page 1: Customer side. Page 2: Internal side.
const PAGE_PAIRS: Array<[string, string]> = [
  ['CUSTOMER COPY', 'CUSTOMER RECEIVING COPY'],
  ['OFFICE RECORD', 'GATE KEEPER COPY'],
];

const FONT_BASE: Record<FontScale, number> = {
  sm: 7,
  md: 8.5,
  lg: 10,
  xl: 11.5,
  '2xl': 13,
};

// Each printable A4 portrait page (after 6mm margin) ≈ 198mm x 285mm.
// Two stacked copies + a 5mm perforation strip → each copy gets ~140mm.
const COPY_HEIGHT_MM = 138;
const COPY_WIDTH_MM = 198;

function SingleChallan({
  dispatch,
  items,
  copyLabel,
  fontScale,
  fitToPage,
}: Props & { copyLabel: string; fontScale: FontScale; fitToPage: boolean }) {
  const totalPacks = items.reduce((s, i) => s + i.num_packs, 0);
  const totalQty = items.reduce((s, i) => s + i.total_qty, 0);

  const base = FONT_BASE[fontScale];
  const tableFs = base - 0.5;
  const headFs = base + 2.5;
  const subFs = base - 1;

  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (!fitToPage) {
      setScale(1);
      return;
    }
    const el = innerRef.current;
    if (!el) return;
    // Convert mm → px (96dpi: 1mm ≈ 3.7795px)
    const targetPx = COPY_HEIGHT_MM * 3.7795275591;
    const measured = el.scrollHeight;
    if (measured <= 0) return;
    const next = Math.min(1, targetPx / measured);
    setScale(next);
  }, [fitToPage, fontScale, items.length, dispatch.id]);

  return (
    <div
      style={{
        width: `${COPY_WIDTH_MM}mm`,
        height: `${COPY_HEIGHT_MM}mm`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${COPY_WIDTH_MM}mm`,
          padding: '3mm 5mm',
          boxSizing: 'border-box',
          fontFamily: 'Arial, sans-serif',
          fontSize: `${base}px`,
          color: '#000',
          display: 'flex',
          flexDirection: 'column',
          minHeight: scale < 1 ? 'auto' : `${COPY_HEIGHT_MM}mm`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #000',
            paddingBottom: '1mm',
            marginBottom: '1.5mm',
          }}
        >
          <div>
            {!dispatch.is_third_party && (
              <>
                <span style={{ fontSize: `${headFs}px`, fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  CANOPLAST INDUSTRIES
                </span>
                <span style={{ fontSize: `${subFs}px`, marginLeft: '6px', color: '#555' }}>
                  Mfrs. of Plastic Products
                </span>
              </>
            )}
            {dispatch.is_third_party && (
              <span style={{ fontSize: `${headFs - 1}px`, fontWeight: 'bold' }}>DISPATCH CHALLAN</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
            <span
              style={{
                fontSize: `${base}px`,
                fontWeight: 'bold',
                border: '1px solid #000',
                padding: '0.5mm 3mm',
                letterSpacing: '1px',
                whiteSpace: 'nowrap',
              }}
            >
              {copyLabel}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/inventory/dispatch?view=${dispatch.id}`}
                size={52}
                level="M"
                includeMargin={false}
              />
              <span style={{ fontSize: `${subFs - 1}px`, marginTop: '0.5mm', color: '#555' }}>
                {dispatch.dispatch_number}
              </span>
            </div>
          </div>
        </div>

        {/* Dispatch info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', gap: '4mm' }}>
          <div style={{ flex: 1 }}>
            {!dispatch.is_third_party && (
              <div style={{ fontWeight: 'bold', fontSize: `${base + 0.5}px`, marginBottom: '0.5mm' }}>
                DISPATCH CHALLAN
              </div>
            )}
            <div>
              <strong>To:</strong>{' '}
              {dispatch.is_third_party
                ? dispatch.consignee_name || dispatch.clients?.name
                : dispatch.clients?.name}
              {dispatch.clients?.address && !dispatch.is_third_party
                ? `, ${dispatch.clients.address}`
                : ''}
              {dispatch.clients?.phone && !dispatch.is_third_party
                ? ` | Ph: ${dispatch.clients.phone}`
                : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div>
              <strong>DC#:</strong> {dispatch.dispatch_number} &nbsp;
              <strong>GP#:</strong> {dispatch.gate_pass_number || '—'}
            </div>
            <div>
              <strong>Date:</strong>{' '}
              {new Date(dispatch.dispatch_date).toLocaleDateString('en-IN')} &nbsp;
              <strong>Vehicle:</strong> {dispatch.vehicle_number || '—'} &nbsp;
              <strong>Driver:</strong> {dispatch.driver_name || '—'}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: `${tableFs}px`,
            marginBottom: '1.5mm',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#eee' }}>
              <th style={{ border: '0.5px solid #000', padding: '1mm', textAlign: 'left', width: '5mm' }}>#</th>
              <th style={{ border: '0.5px solid #000', padding: '1mm', textAlign: 'left' }}>Product</th>
              <th style={{ border: '0.5px solid #000', padding: '1mm', textAlign: 'left' }}>Packing</th>
              <th style={{ border: '0.5px solid #000', padding: '1mm', textAlign: 'right' }}>Pcs/Pack</th>
              <th style={{ border: '0.5px solid #000', padding: '1mm', textAlign: 'right' }}>Packs</th>
              <th style={{ border: '0.5px solid #000', padding: '1mm', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const packingName = item.packing_types?.name || '';
              const pcsPerPack = item.num_packs > 0 ? Math.round(item.total_qty / item.num_packs) : null;
              // Short last = total - (full packs * pcsPerPack)
              const shortLast =
                pcsPerPack !== null && item.num_packs > 0
                  ? item.total_qty - item.num_packs * pcsPerPack
                  : 0;
              return (
                <tr key={item.id}>
                  <td style={{ border: '0.5px solid #000', padding: '0.8mm 1mm' }}>{idx + 1}</td>
                  <td style={{ border: '0.5px solid #000', padding: '0.8mm 1mm' }}>
                    {item.products?.name}
                    {item.products?.code ? ` (${item.products.code})` : ''}
                  </td>
                  <td style={{ border: '0.5px solid #000', padding: '0.8mm 1mm' }}>
                    {packingName || '—'}
                  </td>
                  <td style={{ border: '0.5px solid #000', padding: '0.8mm 1mm', textAlign: 'right' }}>
                    {pcsPerPack ?? '—'}
                  </td>
                  <td style={{ border: '0.5px solid #000', padding: '0.8mm 1mm', textAlign: 'right' }}>
                    {item.num_packs}
                    {shortLast > 0 && (
                      <div style={{ fontSize: `${tableFs - 1}px`, fontStyle: 'italic', color: '#777' }}>
                        (short {shortLast} pcs)
                      </div>
                    )}
                  </td>
                  <td style={{ border: '0.5px solid #000', padding: '0.8mm 1mm', textAlign: 'right', fontWeight: 'bold' }}>
                    {item.total_qty}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#eee', fontWeight: 'bold' }}>
              <td colSpan={4} style={{ border: '0.5px solid #000', padding: '1mm', textAlign: 'right' }}>TOTAL:</td>
              <td style={{ border: '0.5px solid #000', padding: '1mm', textAlign: 'right' }}>{totalPacks}</td>
              <td style={{ border: '0.5px solid #000', padding: '1mm', textAlign: 'right' }}>{totalQty}</td>
            </tr>
          </tfoot>
        </table>

        {dispatch.remarks && (
          <div style={{ fontSize: `${subFs}px`, marginBottom: '1mm' }}>
            <strong>Remarks:</strong> {dispatch.remarks}
          </div>
        )}

        {/* Signatures pinned near bottom */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 'auto',
            paddingTop: '6mm',
            fontSize: `${subFs}px`,
            textAlign: 'center',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '0.5px solid #000', paddingTop: '1mm', marginInline: '4mm' }}>
              Dispatched By
            </div>
            <div style={{ color: '#888', fontSize: `${subFs - 0.5}px` }}>
              {dispatch.dispatched_by || '________'}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '0.5px solid #000', paddingTop: '1mm', marginInline: '4mm' }}>
              Security Check
            </div>
            <div style={{ color: '#888', fontSize: `${subFs - 0.5}px` }}>________</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '0.5px solid #000', paddingTop: '1mm', marginInline: '4mm' }}>
              Received By
            </div>
            <div style={{ color: '#888', fontSize: `${subFs - 0.5}px` }}>________</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerforationLine() {
  return (
    <div
      style={{
        borderTop: '2px dashed #000',
        margin: '0',
        position: 'relative',
        height: '5mm',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '-7px',
          left: '10mm',
          fontSize: '11px',
          backgroundColor: '#fff',
          padding: '0 2mm',
        }}
      >
        ✂
      </span>
      <span
        style={{
          position: 'absolute',
          top: '-7px',
          right: '10mm',
          fontSize: '9px',
          backgroundColor: '#fff',
          padding: '0 2mm',
          color: '#555',
        }}
      >
        cut here
      </span>
    </div>
  );
}

function ChallanPage({
  dispatch,
  items,
  topLabel,
  bottomLabel,
  fontScale,
  fitToPage,
  isLastPage,
}: Props & {
  topLabel: string;
  bottomLabel: string;
  fontScale: FontScale;
  fitToPage: boolean;
  isLastPage: boolean;
}) {
  return (
    <div
      style={{
        width: `${COPY_WIDTH_MM}mm`,
        pageBreakAfter: isLastPage ? 'auto' : 'always',
        breakAfter: isLastPage ? 'auto' : 'page',
      }}
    >
      <SingleChallan
        dispatch={dispatch}
        items={items}
        copyLabel={topLabel}
        fontScale={fontScale}
        fitToPage={fitToPage}
      />
      <PerforationLine />
      <SingleChallan
        dispatch={dispatch}
        items={items}
        copyLabel={bottomLabel}
        fontScale={fontScale}
        fitToPage={fitToPage}
      />
    </div>
  );
}

export const DispatchChallanPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ dispatch, items, fontScale = 'md', fitToPage = true }, ref) => {
    return (
      <div ref={ref} style={{ width: `${COPY_WIDTH_MM}mm`, backgroundColor: '#fff' }}>
        <style>{`
          @page { size: A4 portrait; margin: 6mm; }
          @media print {
            html, body { width: 210mm; margin: 0; padding: 0; }
          }
        `}</style>
        {PAGE_PAIRS.map(([top, bottom], idx) => (
          <ChallanPage
            key={`${top}-${bottom}`}
            dispatch={dispatch}
            items={items}
            topLabel={top}
            bottomLabel={bottom}
            fontScale={fontScale}
            fitToPage={fitToPage}
            isLastPage={idx === PAGE_PAIRS.length - 1}
          />
        ))}
      </div>
    );
  }
);

DispatchChallanPrint.displayName = 'DispatchChallanPrint';
