import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { TallahTopnav } from '../../../../app/components/layout/tallah/TallahTopnav';

const state = {
  store: {} as Record<string, unknown>,
  currency: { code: 'SAR' } as Record<string, unknown>,
};

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: state.store, currency: state.currency }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ languageName: 'العربية' }),
}));
vi.mock('@salla.sa/twilight-components-react/menu', () => ({
  SallaMenu: () => <salla-menu />,
}));
vi.mock('@salla.sa/twilight-components-react/contacts', () => ({
  SallaContacts: () => <salla-contacts />,
}));

const dispatch = vi.fn();

beforeEach(() => {
  state.store = { settings: { is_multilingual: true } };
  state.currency = { code: 'SAR' };
  dispatch.mockReset();
  (window as unknown as { salla: unknown }).salla = {
    event: { dispatch },
    config: {
      get: (key: string) =>
        key === 'currencies' ? { SAR: { symbol: ' ر.س' } } : key === 'user.currency_code' ? 'SAR' : undefined,
    },
  };
});
afterEach(() => {
  delete (window as unknown as { salla?: unknown }).salla;
});

describe('TallahTopnav', () => {
  it('lays out the menu, the contacts and the language button as three columns', () => {
    state.store = { contacts: { phone: '8001111210' }, settings: { is_multilingual: true } };
    const { container } = render(<TallahTopnav />);
    expect([...container.querySelector('.tallah-topnav__row')!.children].map((c) => c.className)).toEqual([
      'tallah-topnav__menu',
      'tallah-topnav__contacts',
      'tallah-topnav__localize',
    ]);
    expect(container.querySelector('salla-menu')).not.toBeNull();
    expect(container.querySelector('salla-contacts')).not.toBeNull();
  });

  it('shows the language and the currency symbol the SDK knows', () => {
    const { container } = render(<TallahTopnav />);
    const button = container.querySelector('.tallah-topnav__localize button')!;
    expect(button.textContent).toBe('العربية-ر.س');
  });

  it('opens the localization modal', () => {
    const { container } = render(<TallahTopnav />);
    fireEvent.click(container.querySelector('.tallah-topnav__localize button')!);
    expect(dispatch).toHaveBeenCalledWith('localization::open', undefined);
  });

  it('has no language button when the store has one language and one currency', () => {
    state.store = { settings: {} };
    expect(render(<TallahTopnav />).container.querySelector('.tallah-topnav__localize')).toBeNull();
  });

  it('shows a branch button only when the store has branches, opening the scopes modal', () => {
    expect(render(<TallahTopnav />).container.querySelector('.btn--rounded-gray')).toBeNull();

    state.store = { scope: { name: 'Riyadh' }, settings: {} };
    const { container } = render(<TallahTopnav />);
    const button = container.querySelector<HTMLButtonElement>('.btn--rounded-gray')!;
    expect(button.textContent).toContain('Riyadh');
    fireEvent.click(button);
    expect(dispatch).toHaveBeenCalledWith('scopes::open', { mode: 'default' });
  });
});
