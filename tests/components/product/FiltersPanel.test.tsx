import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FiltersPanel } from '../../../app/components/product/FiltersPanel';

const calls: string[] = [];
const widgetHeights = vi.fn();

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

/** Records a native `blur` on its two inputs, as the SDK widget listens (once, not per render). */
function useNativeBlur(root: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onBlur = (event: Event) => {
      const input = event.target as HTMLInputElement;
      calls.push(`blur-${input.dataset.testid === 'min' ? 'min' : 'max'}:${input.value}`);
    };
    el.querySelectorAll('input').forEach((i) => i.addEventListener('blur', onBlur));
    return () => el.querySelectorAll('input').forEach((i) => i.removeEventListener('blur', onBlur));
  }, [root]);
}

function FakeSallaFilters({ id }: { id: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useNativeBlur(ref);
  return (
    <div id={id} ref={ref} data-testid="salla-filters">
      {React.createElement(
        'salla-filters-widget',
        {
          ref: (el: (HTMLElement & { setWidgetHeight?: () => void }) | null) => {
            if (el) el.setWidgetHeight = widgetHeights;
          },
        },
        React.createElement(
        'salla-price-range',
        null,
        <div className="s-price-range-inputs">
          <input className="s-price-range-number-input" type="number" data-testid="min" />
          <input className="s-price-range-number-input" type="number" data-testid="max" />
          {React.createElement(
            'salla-button',
            null,
            <button type="button" data-testid="sdk-apply" onClick={() => calls.push('sdk-click')}>
              arrow
            </button>
          )}
        </div>
      )
      )}
    </div>
  );
}

// The SDK widget's markup: two number inputs (read on a native `blur`) and its own arrow button, inside <salla-price-range>.
vi.mock('@salla.sa/twilight-components-react/filters', () => ({ SallaFilters: (props: { id: string }) => <FakeSallaFilters {...props} /> }));

afterEach(() => {
  cleanup();
  calls.length = 0;
  widgetHeights.mockClear();
});

const type = (testId: string, value: string) => {
  fireEvent.input(screen.getByTestId(testId), { target: { value } });
};
const apply = () => screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement;

async function renderPanel(busy = false) {
  const view = render(<FiltersPanel id="filters-menu" filters={[]} busy={busy} />);
  await waitFor(() => expect(apply()).toBeTruthy());
  return view;
}

describe('FiltersPanel price Apply button', () => {
  it('adds a labelled Apply button inside the price section, disabled until there is a range', async () => {
    await renderPanel();
    expect(apply().closest('salla-price-range')).not.toBeNull();
    expect(apply().disabled).toBe(true);
    type('min', '50');
    expect(apply().disabled).toBe(false);
  });

  it('commits both fields (a blur each) before it presses the SDK button, so the SDK sees what is typed', async () => {
    await renderPanel();
    type('min', '50');
    type('max', '200');
    fireEvent.click(apply());
    expect(calls).toEqual(['blur-min:50', 'blur-max:200', 'sdk-click']);
  });

  it('applies with Enter from a field too', async () => {
    await renderPanel();
    type('min', '10');
    type('max', '20');
    fireEvent.keyDown(screen.getByTestId('max'), { key: 'Enter' });
    expect(calls).toEqual(['blur-min:10', 'blur-max:20', 'sdk-click']);
  });

  it('applies an open range (only a minimum, or only a maximum)', async () => {
    await renderPanel();
    type('max', '150');
    fireEvent.click(apply());
    expect(calls).toEqual(['blur-min:', 'blur-max:150', 'sdk-click']);
  });

  it('refuses a minimum above the maximum: a message, an invalid mark on the fields, no apply', async () => {
    await renderPanel();
    type('min', '500');
    type('max', '100');
    expect(apply().disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe('The minimum price cannot be higher than the maximum');
    expect(screen.getByTestId('min').getAttribute('aria-invalid')).toBe('true');
    fireEvent.click(apply());
    fireEvent.keyDown(screen.getByTestId('min'), { key: 'Enter' });
    expect(calls).toEqual([]);
    // Fixing the range clears it.
    type('min', '50');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('min').getAttribute('aria-invalid')).toBe('false');
    expect(apply().disabled).toBe(false);
  });

  it('refuses a negative price', async () => {
    await renderPanel();
    type('min', '-5');
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid price');
    expect(apply().disabled).toBe(true);
  });

  it('stays editable and is disabled, marked busy, while the list is re-querying', async () => {
    const { rerender } = await renderPanel();
    type('min', '50');
    expect(apply().disabled).toBe(false);
    rerender(<FiltersPanel id="filters-menu" filters={[]} busy />);
    expect(apply().disabled).toBe(true);
    expect(apply().getAttribute('aria-busy')).toBe('true');
    expect((screen.getByTestId('min') as HTMLInputElement).disabled).toBe(false);
  });

  it('has the SDK measure the widget again once the button, and a message above it, are in the section', async () => {
    await renderPanel();
    await waitFor(() => expect(widgetHeights).toHaveBeenCalled());
    widgetHeights.mockClear();
    type('min', '500');
    type('max', '100');
    await waitFor(() => expect(widgetHeights).toHaveBeenCalled());
  });

  it('adds the button once per widget and removes it with the panel', async () => {
    const { container, unmount } = await renderPanel();
    await act(async () => {});
    expect(container.querySelectorAll('.tallah-price-apply')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Apply' })).toHaveLength(1);
    unmount();
    expect(document.querySelectorAll('.tallah-price-apply')).toHaveLength(0);
  });
});
