import { describe, expect, it } from 'vitest';
import { computeNeed, type BomDraftLine } from '@/lib/bom';

const line = (p: Partial<BomDraftLine>): BomDraftLine => ({
  key: 'k',
  role: 'base',
  stage: 'molding',
  material_id: 'm',
  component_product_id: null,
  qty_basis: 'g_per_pc',
  qty: '0',
  pack_size: '',
  waste_percent: '0',
  is_optional: false,
  notes: null,
  ...p,
});

// Expected values taken from live v_product_bom rows.
describe('computeNeed mirrors v_product_bom.need_per_piece', () => {
  it('grams per piece → kg, waste included', () => {
    expect(computeNeed(line({ qty: '7', waste_percent: '5' }), 'kg')).toEqual({ base_unit: 'kg', need_per_piece: expect.closeTo(0.00735, 10) });
    expect(computeNeed(line({ qty: '0.0032', waste_percent: '5' }), 'gms').need_per_piece).toBeCloseTo(0.00000336, 12);
  });
  it('per piece in the material unit', () => {
    expect(computeNeed(line({ qty_basis: 'unit_per_pc', qty: '1', waste_percent: '5' }), 'pcs')).toEqual({ base_unit: 'pcs', need_per_piece: expect.closeTo(1.05, 10) });
    expect(computeNeed(line({ qty_basis: 'unit_per_pc', qty: '1', waste_percent: '5' }), 'kg')).toEqual({ base_unit: 'kg', need_per_piece: expect.closeTo(1.05, 10) });
    // material stocked in grams → converted to kg
    expect(computeNeed(line({ qty_basis: 'unit_per_pc', qty: '1', waste_percent: '5' }), 'gms')).toEqual({ base_unit: 'kg', need_per_piece: expect.closeTo(0.00105, 10) });
  });
  it('per pack divides by pack size', () => {
    expect(computeNeed(line({ role: 'packing_outer', qty_basis: 'unit_per_pack', qty: '1', pack_size: '1000' }), 'pcs')).toEqual({ base_unit: 'pcs', need_per_piece: 0.001 });
  });
  it('components are pcs per set', () => {
    expect(computeNeed(line({ role: 'component', material_id: null, component_product_id: 'p', qty_basis: 'unit_per_pc', qty: '2' }), null)).toEqual({ base_unit: 'pcs', need_per_piece: 2 });
  });
});
