import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { SingleOptionButtons } from '../../../app/components/product/SingleOptionButtons';
import { WishlistHeartButton } from '../../../app/components/product/WishlistHeartButton';

/** The markup Salla's options widget builds for a size: a labelled block around a `<select>`. */
function Host({ children }: { children?: React.ReactNode }) {
  return (
    <div id="product-1">
      <div className="s-product-options-option" data-option-type="single-option">
        <div className="s-product-options-option-content">
          <div>
            <select name="options[7]" className="s-form-control" required>
              <option value="">Choose</option>
              <option value="11">M</option>
              <option value="12">L</option>
              <option value="13" disabled>
                XL
              </option>
            </select>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

afterEach(cleanup);

describe('SingleOptionButtons (the Twig turns the size select into buttons)', () => {
  it('shows every choice but the "choose" prompt as a button, the unavailable one disabled', async () => {
    render(
      <Host>
        <SingleOptionButtons rootId="product-1" />
      </Host>
    );
    const buttons = await screen.findAllByRole('radio');
    expect(buttons.map((b) => b.textContent)).toEqual(['M', 'L', 'XL']);
    expect((buttons[2] as HTMLButtonElement).disabled).toBe(true);
    expect(buttons.every((b) => b.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('sets the real select and fires its change, so the widget updates the variant and price', async () => {
    const { container } = render(
      <Host>
        <SingleOptionButtons rootId="product-1" />
      </Host>
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    const onChange = vi.fn();
    select.addEventListener('change', onChange);

    fireEvent.click(await screen.findByRole('radio', { name: 'L' }));

    expect(select.value).toBe('12');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('radio', { name: 'L' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'L' }).className).toContain('is-active');
    expect(screen.getByRole('radio', { name: 'M' }).getAttribute('aria-checked')).toBe('false');
  });

  it('keeps the select in the page, hidden, and still required', async () => {
    const { container } = render(
      <Host>
        <SingleOptionButtons rootId="product-1" />
      </Host>
    );
    await screen.findAllByRole('radio');
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select.required).toBe(true);
    expect(select.dataset.tallahButtons).toBe('true');
    expect(select.getAttribute('aria-hidden')).toBe('true');
  });

  it('follows a change made to the select itself (a variant reset)', async () => {
    const { container } = render(
      <Host>
        <SingleOptionButtons rootId="product-1" />
      </Host>
    );
    await screen.findAllByRole('radio');
    const select = container.querySelector('select') as HTMLSelectElement;
    select.value = '11';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'M' }).getAttribute('aria-checked')).toBe('true'));
  });
});

describe('WishlistHeartButton on the product page', () => {
  it("draws single.twig's pair of hearts when asked, and the icon-font glyph otherwise", () => {
    const { container, rerender } = render(
      <WishlistHeartButton productId={1} className="is-added" ariaLabel="Wishlist" onClick={() => {}} twigIcon />
    );
    expect(container.querySelector('svg.filled')).toBeTruthy();
    expect(container.querySelector('svg.not_filled')).toBeTruthy();
    expect(container.querySelector('i.sicon-heart')).toBeNull();
    rerender(<WishlistHeartButton productId={1} className="is-added" ariaLabel="Wishlist" onClick={() => {}} />);
    expect(container.querySelector('i.sicon-heart')).toBeTruthy();
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('SingleOptionButtons order and freshness', () => {
  const options = [
    {
      id: 7,
      name: 'Size',
      type: 'single-option',
      required: true,
      details: [
        { id: 11, name: 'M' },
        { id: 12, name: 'L' },
        { id: 13, name: 'XL' },
      ],
    },
  ] as never;

  const labels = () => screen.getAllByRole('radio').map((b) => b.textContent);

  it('keeps the product\'s order when the widget rebuilds the select in another one', async () => {
    const { container } = render(
      <Host>
        <SingleOptionButtons rootId="product-1" options={options} />
      </Host>
    );
    expect(await screen.findAllByRole('radio')).toHaveLength(3);
    expect(labels()).toEqual(['M', 'L', 'XL']);

    // The widget rewrites the select with the same values, in a different order (and the prompt first).
    const select = container.querySelector('select') as HTMLSelectElement;
    select.innerHTML = '<option value="">Choose</option><option value="13">XL</option><option value="11">M</option><option value="12">L</option>';
    await waitFor(() => expect(labels()).toEqual(['M', 'L', 'XL']));
  });

  it('puts a value the product does not list after the listed ones, in the select\'s order', async () => {
    const { container } = render(
      <Host>
        <SingleOptionButtons rootId="product-1" options={options} />
      </Host>
    );
    await screen.findAllByRole('radio');
    const select = container.querySelector('select') as HTMLSelectElement;
    select.innerHTML = '<option value="">Choose</option><option value="99">XXL</option><option value="13">XL</option><option value="11">M</option>';
    await waitFor(() => expect(labels()).toEqual(['M', 'XL', 'XXL']));
  });

  it('follows the widget when it relabels or disables a choice, without a click', async () => {
    const { container } = render(
      <Host>
        <SingleOptionButtons rootId="product-1" options={options} />
      </Host>
    );
    await screen.findAllByRole('radio');
    const select = container.querySelector('select') as HTMLSelectElement;
    // A colour pick: the widget marks a size sold out.
    select.options[2].text = 'L - sold out';
    select.options[2].disabled = true;
    await waitFor(() => expect(labels()).toEqual(['M', 'L - sold out', 'XL']));
    expect((screen.getAllByRole('radio')[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the select\'s own order when the product lists no values for it', async () => {
    render(
      <Host>
        <SingleOptionButtons rootId="product-1" />
      </Host>
    );
    expect((await screen.findAllByRole('radio')).map((b) => b.textContent)).toEqual(['M', 'L', 'XL']);
  });
});
