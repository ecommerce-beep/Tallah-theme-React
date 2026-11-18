/**
 * `store.settings.installments` lists the store's installment providers. Only an empty array is known to mean "none"
 * (the engine types it `unknown[] | object | string | null`, and `[]` is truthy, so a plain truthiness test is wrong).
 * A missing value, `null`, an object or a string could still hold providers, so none of them counts as "none".
 */
export function hasNoInstallmentProviders(installments: unknown): boolean {
  return Array.isArray(installments) && installments.length === 0;
}
