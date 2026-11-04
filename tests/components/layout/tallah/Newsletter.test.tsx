import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { Newsletter } from '../../../../app/components/layout/tallah/Newsletter';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

const notify = { error: vi.fn(), info: vi.fn() };
const fetchMock = vi.fn();

beforeEach(() => {
  notify.error.mockReset();
  notify.info.mockReset();
  fetchMock.mockReset().mockResolvedValue({});
  vi.stubGlobal('fetch', fetchMock);
  (window as unknown as { salla: unknown }).salla = { notify };
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as { salla?: unknown }).salla;
});

const submit = (container: HTMLElement, email: string) => {
  const input = container.querySelector<HTMLInputElement>('input[name="EMAIL"]')!;
  fireEvent.change(input, { target: { value: email } });
  fireEvent.submit(container.querySelector('form')!);
};

describe('Newsletter', () => {
  it('posts the email to the merchant url, in no-cors mode', async () => {
    const { container } = render(<Newsletter url="https://list.example.com/subscribe" />);
    submit(container, 'a@b.co');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://list.example.com/subscribe');
    expect(init.method).toBe('POST');
    expect(init.mode).toBe('no-cors');
    expect((init.body as FormData).get('EMAIL')).toBe('a@b.co');
    await waitFor(() => expect(notify.info).toHaveBeenCalledTimes(1));
  });

  it('rejects an invalid email without sending', () => {
    const { container } = render(<Newsletter url="https://list.example.com/subscribe" />);
    submit(container, 'not-an-email');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledTimes(1);
  });

  it.each(['', 'https://s.salla.sa', 'ftp://x.example.com', 'not a url'])(
    'never sends, nor claims success, for the unusable url %j',
    (url) => {
      const { container } = render(<Newsletter url={url} />);
      submit(container, 'a@b.co');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(notify.info).not.toHaveBeenCalled();
      expect(notify.error).toHaveBeenCalledTimes(1);
    }
  );

  it('reports a failed request', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const { container } = render(<Newsletter url="https://list.example.com/subscribe" />);
    submit(container, 'a@b.co');
    await waitFor(() => expect(notify.error).toHaveBeenCalledTimes(1));
    expect(notify.info).not.toHaveBeenCalled();
  });
});
