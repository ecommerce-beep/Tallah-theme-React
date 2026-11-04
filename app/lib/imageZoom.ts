/**
 * The magnifier glass of the Twig theme (`assets/js/partials/image-zoom.js`, turned on by the
 * `imageZoom` setting): a round lens that follows the pointer over the image and shows it at `strength`
 * times the size. Styling is `.img-magnifier-glass` in `04-components/product.scss`.
 * Returns a cleanup that removes the lens and its listeners.
 */
export function attachImageZoom(img: HTMLImageElement, strength = 2): () => void {
  const parent = img.parentElement;
  if (!parent || parent.querySelector('.img-magnifier-glass')) return () => undefined;

  const glass = document.createElement('div');
  glass.className = 'img-magnifier-glass';
  parent.insertBefore(glass, img);
  glass.style.backgroundImage = `url('${img.currentSrc || img.src}')`;
  glass.style.backgroundRepeat = 'no-repeat';
  glass.style.backgroundSize = `${img.width * strength}px ${img.height * strength}px`;

  const border = 3;
  const halfW = glass.offsetWidth / 2;
  const halfH = glass.offsetHeight / 2;

  const move = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const point = 'touches' in event ? event.touches[0] : event;
    const rect = img.getBoundingClientRect();
    let x = point.clientX - rect.left;
    let y = point.clientY - rect.top;
    // keep the lens inside the image
    x = Math.min(Math.max(x, halfW / strength), img.width - halfW / strength);
    y = Math.min(Math.max(y, halfH / strength), img.height - halfH / strength);
    glass.style.left = `${x - halfW}px`;
    glass.style.top = `${y - halfH}px`;
    glass.style.backgroundPosition = `-${x * strength - halfW + border}px -${y * strength - halfH + border}px`;
  };

  const targets: HTMLElement[] = [glass, img];
  for (const target of targets) {
    target.addEventListener('mousemove', move as EventListener);
    target.addEventListener('touchmove', move as EventListener, { passive: false });
  }
  return () => {
    for (const target of targets) {
      target.removeEventListener('mousemove', move as EventListener);
      target.removeEventListener('touchmove', move as EventListener);
    }
    glass.remove();
  };
}
