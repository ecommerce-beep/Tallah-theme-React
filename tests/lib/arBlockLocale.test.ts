import { describe, it, expect } from 'vitest';
import { collectionItems } from '../../app/lib/arBlock';

// The shape the Theme Editor wrote for a translated review (copied from `twilight.preview.json` after adding the block).
const edited = {
  ar: { 'testimonials.testimonial': 'الجينز واسع ومريح جدًا', 'testimonials.product_name': 'بنطال جينز واسع' },
  en: { 'testimonials.testimonial': 'These wide leg jeans are comfortable', 'testimonials.product_name': 'Wide Leg Jeans' },
  image: 'https://cdn.example/a.webp',
  review: 5,
  testimonial: 'These wide leg jeans are comfortable',
  product_name: 'Wide Leg Jeans',
};

describe('collectionItems with per-language items', () => {
  it('lays the current language over the bare default-language text', () => {
    const [item] = collectionItems<Record<string, unknown>>([edited], 'testimonials', 'ar');
    expect(item.product_name).toBe('بنطال جينز واسع');
    expect(item.testimonial).toBe('الجينز واسع ومريح جدًا');
    expect(item.image).toBe('https://cdn.example/a.webp');
    expect(item.review).toBe(5);
  });

  it('keeps the bare text for a language without a translation, and when no language is asked for', () => {
    expect(collectionItems<Record<string, unknown>>([edited], 'testimonials', 'fr')[0].product_name).toBe('Wide Leg Jeans');
    expect(collectionItems<Record<string, unknown>>([edited], 'testimonials')[0].product_name).toBe('Wide Leg Jeans');
  });

  it('gives English its own translation', () => {
    expect(collectionItems<Record<string, unknown>>([edited], 'testimonials', 'en')[0].product_name).toBe('Wide Leg Jeans');
  });
});
