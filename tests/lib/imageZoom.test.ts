import { describe, it, expect } from 'vitest';
import { attachImageZoom } from '../../app/lib/imageZoom';

function mountImage() {
  const wrapper = document.createElement('div');
  const img = document.createElement('img');
  img.src = 'https://cdn.test/a.jpg';
  Object.defineProperty(img, 'width', { value: 400 });
  Object.defineProperty(img, 'height', { value: 400 });
  img.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
  wrapper.appendChild(img);
  document.body.appendChild(wrapper);
  return { wrapper, img };
}

describe('attachImageZoom (the imageZoom setting)', () => {
  it('puts a lens before the image, zoomed to twice its size', () => {
    const { wrapper, img } = mountImage();
    attachImageZoom(img, 2);
    const glass = wrapper.querySelector('.img-magnifier-glass') as HTMLElement;
    expect(glass).toBeTruthy();
    expect(glass.nextElementSibling).toBe(img);
    expect(glass.style.backgroundSize).toBe('800px 800px');
  });

  it('moves the lens with the pointer and keeps it inside the image', () => {
    const { wrapper, img } = mountImage();
    attachImageZoom(img, 2);
    const glass = wrapper.querySelector('.img-magnifier-glass') as HTMLElement;
    img.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 100, bubbles: true }));
    expect(glass.style.left).toBe('200px');
    expect(glass.style.top).toBe('100px');
    img.dispatchEvent(new MouseEvent('mousemove', { clientX: 5000, clientY: 5000, bubbles: true }));
    expect(parseFloat(glass.style.left)).toBeLessThanOrEqual(400);
  });

  it('adds one lens per image and removes it on cleanup', () => {
    const { wrapper, img } = mountImage();
    const cleanup = attachImageZoom(img, 2);
    attachImageZoom(img, 2);
    expect(wrapper.querySelectorAll('.img-magnifier-glass')).toHaveLength(1);
    cleanup();
    expect(wrapper.querySelector('.img-magnifier-glass')).toBeNull();
  });
});
