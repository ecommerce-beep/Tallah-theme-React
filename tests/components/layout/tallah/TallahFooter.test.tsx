import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { hasPaymentContent } from '../../../../app/lib/footerPayments';
import { TallahFooter } from '../../../../app/components/layout/tallah/TallahFooter';

const state = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
}));

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: state.store }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({ HookSlot: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Image: () => <img alt="" />,
  Link: ({ children }: { children?: React.ReactNode }) => <a href="/">{children}</a>,
}));
vi.mock('@salla.sa/twilight-theme-engine/modal', () => ({ ImageModal: () => null }));
vi.mock('@salla.sa/twilight-components-react/apps-icons', () => ({
  SallaAppsIcons: () => <div data-testid="apps" />,
}));
vi.mock('@salla.sa/twilight-components-react/contacts', () => ({ SallaContacts: () => null }));
vi.mock('@salla.sa/twilight-components-react/menu', () => ({ SallaMenu: () => null }));
vi.mock('@salla.sa/twilight-components-react/payments', () => ({
  SallaPayments: () => <div data-testid="payments" />,
}));
vi.mock('@salla.sa/twilight-components-react/social', () => ({ SallaSocial: () => null }));
vi.mock('../../../../app/components/layout/tallah/Newsletter', () => ({ Newsletter: () => null }));
vi.mock('../../../../app/components/layout/tallah/settings', () => ({
  useTallahSettings: () => ({ footerLogoSize: 'medium', newsletter: { show: false, url: '' } }),
}));

afterEach(cleanup);

function footer(store: Record<string, unknown>) {
  state.store = { name: 'Store', logo: '', ...store };
  return render(<TallahFooter />);
}

describe('hasPaymentContent', () => {
  it('is true for payment methods, or for the badges <salla-payments> draws without any', () => {
    expect(hasPaymentContent({ payments: ['mada'] })).toBe(true);
    expect(hasPaymentContent({ payments: [], made_in_ksa: true })).toBe(true);
    expect(hasPaymentContent({ certificate: { id: '123' } })).toBe(true);
  });

  it('is false for an empty or missing configuration', () => {
    expect(hasPaymentContent({ payments: [] })).toBe(false);
    expect(hasPaymentContent({})).toBe(false);
    expect(hasPaymentContent(undefined)).toBe(false);
    expect(hasPaymentContent({ payments: null, certificate: null })).toBe(false);
  });
});

describe('TallahFooter bottom band', () => {
  it('shows the payments for a store with payment methods', () => {
    const { container, getByTestId } = footer({ settings: { payments: ['mada', 'visa'] } });
    expect(container.querySelector('.tallah-footer__bottom')).not.toBeNull();
    expect(getByTestId('payments')).toBeTruthy();
  });

  it('renders no empty band for a store without payment methods', () => {
    const { container } = footer({ settings: { payments: [] } });
    expect(container.querySelector('.tallah-footer__bottom')).toBeNull();
  });

  it('renders no empty band when the payment configuration is missing', () => {
    const { container } = footer({ settings: {} });
    expect(container.querySelector('.tallah-footer__bottom')).toBeNull();
    const noSettings = footer({});
    expect(noSettings.container.querySelector('.tallah-footer__bottom')).toBeNull();
  });

  it('keeps the band for a tax number even with no payments', () => {
    const { container, getByTestId, queryByTestId } = footer({
      settings: { payments: [], tax: { number: '300000000000003' } },
    });
    expect(container.querySelector('.tallah-footer__bottom')).not.toBeNull();
    expect(getByTestId('tallah-footer-tax')).toBeTruthy();
    expect(queryByTestId('payments')).toBeNull();
  });

  it('keeps the band for app download links even with no payments', () => {
    const { container, findByTestId } = footer({
      settings: { payments: [] },
      apps: { appstore: 'https://apps.apple.com/x' },
    });
    expect(container.querySelector('.tallah-footer__bottom')).not.toBeNull();
    return findByTestId('apps').then((el) => expect(el).toBeTruthy());
  });
});
