/** Section 33 — the supplier agent must check inventory before recommending a purchase. */

export interface InventoryOffsetResult {
  quantityNeeded: number;
  quantityFromInventory: number;
  quantityToBuy: number;
}

export function offsetRequirementWithInventory(
  quantityNeeded: number,
  quantityOnHand: number,
): InventoryOffsetResult {
  const quantityFromInventory = Math.max(0, Math.min(quantityNeeded, quantityOnHand));
  const quantityToBuy = Math.max(0, quantityNeeded - quantityFromInventory);
  return { quantityNeeded, quantityFromInventory, quantityToBuy };
}
