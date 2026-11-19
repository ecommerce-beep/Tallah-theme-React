// Rebuilds the local TALLAH Homepage in `twilight.preview.json` (gitignored; per-developer Theme Editor state).
// Mirrors the order and content of the live TALLAH demo store (demostore.salla.sa/ar/dev-ff8tnndomnlqddrf).
// Usage: node docs/preview/build-tallah-home.cjs   (keeps the file's `settings`, replaces only `layout`)
const fs = require('fs');
const file = 'twilight.preview.json';
const raw = fs.readFileSync(file, 'utf8');
const p = JSON.parse(raw);
const store = 'https://demostore.salla.sa/ar/dev-ff8tnndomnlqddrf/-/';
const C = store + 'c432786305';
const IMG = (h, n = '1954265887') => `https://cdn.files.salla.network/homepage/${n}/${h}.webp`;
const al = (v) => [{ label: v, value: v, key: 'k-' + v }];
const id = (n) => 'b-tallah-' + n;

const hb = (d, m, bottom, sub, url) => ({
  desktop_bg: d, mobile_bg: m, items_alignment: al('center'), items_alignment_vertical: al('center'),
  block_title: 'اكتشف الفخامة الخالدة', blocktitle_color: '#ffffff', subtext: sub, subtext_color: '#FAFAFA',
  transparent_button: true, button_bottom: bottom, button_text: 'تسوق الان', button_text_color: '#FAFAFA', button_bg: '#262626', url,
});
const sb = (t, s, d, m, c) => ({ desktop_bg: d, mobile_bg: m, block_title: t, blocktitle_color: '#ffffff', subtext: s, subtext_color: c || '#FAFAFA', button_text: 'تسوق الان', button_text_color: '#ffffff', button_bg: '#ffffff', transparent_button: true, url: C });
const rv = (h, n, q) => ({ image: IMG(h), product_name: n, product_name_color: '#000000', review: 5, testimonial: q, testimonial_color: '#000000' });

const layout = [
  { id: id('hero-section'), path: 'AR-Hero-section', fields: { key: 'tallah-hero-section', banner: [
    hb('https://cdn.files.salla.network/homepage/1366575517/93f8653a-5082-4284-a873-c3f565ba2343.webp', IMG('ab8b1de8-f4c9-451b-8f5c-c8286273f96a'), false, 'إعادة تعريف الأناقة من خلال مجموعات مختارة بعناية تناسب أسلوب الحياة العصري', store + 'c1413935499'),
    hb('https://cdn.files.salla.network/homepage/1366575517/6e96829a-26f6-435e-bb96-300456389be9.webp', '', true, 'إعادة تعريف الأناقة من خلال مجموعات مختارة بعناية تناسب نمط الحياة العصري', C),
  ] } },
  { id: id('our-products'), path: 'AR_our_products', fields: { key: 'tallah-our-products', section_title: 'القطع المفضّلة عند الجميع', section_sub_title: 'تصاميم خالدة اختارها مجتمعنا — اكتشف الأكثر رواجًا الآن', link_title: 'عرض كل المنتجات', rh_cat_btn_url: C, source_type: 'latest', grid_cols_number: 4 } },
  { id: id('special-1'), path: 'AR-special-banner', fields: { key: 'tallah-special-1', center_text: false, banner: [
    sb('تشكيلة الشتاء', 'ارتدي أناقة مع معاطف راقية وخامات دافئة للموسم البارد.', IMG('f3500394-44bf-46b8-8fa1-71369ca7bba7'), IMG('2a9b1ab9-0f68-43cd-9843-2dbdc3ab3667'), '#ffffff'),
    sb('منتجات جديدة وصلت حديثًا', 'كن أول من يكتشف أحدث إصداراتنا، مصممة خصيصًا للموسم القادم', IMG('aab94b15-01c3-4118-8e30-db947cc1c2c8', '1366575517'), IMG('361298fa-4d5e-4d42-9396-2c18ed0ce895', '1366575517')),
  ] } },
  { id: id('products-banner'), path: 'AR-Products-banner', fields: { key: 'tallah-products-banner', banner_image: IMG('df14f886-e706-4062-a8d8-18bcee84a483'), block_title: 'أستايل بلا مجهود، مختار خصيصًا لك', block_title_color: '#000000', url_text: 'تسوّق الإطلالة', url_color: '#000000', url: C, source_type: 'latest' } },
  { id: id('hero-2'), path: 'AR-Hero-2', fields: { key: 'tallah-hero-2', desktop_bg: IMG('9bdfb53d-2bb3-469c-8a0b-960a603e94f1'), mobile_bg: IMG('ed02dc26-a31f-4f7f-9f13-5c3fd1835d51'), items_alignment: al('center'), block_title: 'عروض حصرية لك', blocktitle_color: '#ffffff', subtext: 'لا تفوتوا العروض محدودة الوقت والخصومات الخاصة', subtext_color: '#FAFAFA', button_text: 'عروض المتجر', button_text_color: '#FAFAFA', button_bg: '#262626', transparent_button: true, url: store + 'c1413935499', button_bottom: true } },
  { id: id('promo'), path: 'Ar-Promo-banner', fields: { key: 'tallah-promo', banner_image: IMG('16d169f2-189b-4d01-a02a-39258868bfdf'), block_title: 'ستايل سهل وأنيق، مختار بعناية لك', block_title_color: '#000000', subtext: 'كل قطعة في تشكيلتنا مختارة بعناية لتضيف سهولة ورقي لخزانة ملابسك اليومية. طبقات أنيقة بدون تعب، خامات متعددة الاستخدام، وتصاميم خالدة تجتمع لتخلق إطلالات طبيعية بنفس قدر أناقتها.', subtext_color: '#000000', url: store + 'c1067662384', url_text: 'تسوّق الإطلالة الآن', url_color: '#000000' } },
  { id: id('special-2'), path: 'AR-special-banner', fields: { key: 'tallah-special-2', center_text: false, banner: [
    sb('الأساسيات الراقية', 'أساسيات خزانة الملابس مُعاد تصورها بلمسة عصرية وفاخرة', IMG('a1367629-5e46-4ab6-8ceb-ef5169e325d3', '1366575517'), IMG('a1367629-5e46-4ab6-8ceb-ef5169e325d3', '1366575517'), '#ffffff'),
    sb('تشكيلة الرسميات', 'قطع أنيقة وخالدة مصممة لكل مناسبة', IMG('9fc84b59-3dc2-41ee-8c1d-8c0bb80ceb78', '1366575517'), IMG('9fc84b59-3dc2-41ee-8c1d-8c0bb80ceb78', '1366575517')),
  ] } },
  { id: id('testimonials'), path: 'AR-Custom-testimonials', fields: { key: 'tallah-testimonials', block_title: 'آراء العملاء', blocktitle_color: '#000000', subtext: 'قصص حقيقية. تجارب حقيقية', subtext_color: '#000000', url: '', url_text: '', url_color: '#000000', testimonials: [
    rv('6e223671-8db8-4371-9979-0c88ace5fc22', 'Wide Leg Jeans', 'These wide leg jeans are incredibly comfortable and stylish. The fabric feels premium and holds its shape all day.'),
    rv('760c9830-74fc-4465-b5a8-77d70598313f', 'Cotton Shirt', 'A soft and breathable cotton shirt that’s perfect for everyday wear. Great quality and easy to care for.'),
    rv('3a49b159-d367-42eb-996f-3155625747d3', 'Jacket', 'This jacket is stylish, warm, and well-made. Perfect for layering and everyday outfits.'),
    rv('bb974961-a6ca-43a0-97f3-86288e5f1237', 'Women’s Shirt', 'A beautifully designed women’s shirt that’s both comfortable and flattering. Easy to dress up or down.'),
    rv('6e223671-8db8-4371-9979-0c88ace5fc22', 'Men’s Shirt', 'This men’s shirt offers excellent fabric quality and a modern fit. Comfortable, durable, and perfect for daily wear.'),
  ] } },
];
p.layout = layout;
fs.writeFileSync(file, JSON.stringify(p, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
console.log(layout.map((b) => b.path).join('\n'));
