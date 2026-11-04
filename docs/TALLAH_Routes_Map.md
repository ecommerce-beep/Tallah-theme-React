<div dir="rtl">

# خريطة مسارات طلة

> المصدر: `app/routeTree.gen.ts` بعد البناء، وملفات `app/routes/`، ومجلد `.twilight` داخل المحرك (1.0.141).
> كل مسار يبدأ فعليًا بـ `/{-$locale}`؛ نختبر على `/ar` أو `/en` وليس `/`.

## ١. كيف تعمل المسارات هنا

- `app/routes.ts` فارغ حاليًا. أي مسار جديد يحتاج `route('/path', 'file.tsx')` فيه، وملفًا في `app/routes/`.
- الملفات التي تحمل `// @auto-generated` في أول سطر (مثل `index.tsx` و`blog.tsx` و`brands.tsx` وملفات `account.*`) ينسخها المحرك ويعيد كتابتها؛ **لا تُعدَّل**.
- الملفات بلا تلك العلامة هي تخصيصات الثيم: `cart.tsx` و`$slug.p$id.tsx` و`$slug.page-$id.tsx` (انظر `FORKS.md`)، و`__root.tsx`.
- مسارات تأتي من المحرك مباشرة بلا ملف في `app/routes/`: البحث والمنتجات والعروض والتصنيف والوسوم وغيرها (الجدول).
- `app/routeTree.gen.ts` مولَّد ولا يُعدَّل.

## ٢. الجدول

الرمز: **م** = مسار من المحرك بلا ملف محلي، **ن** = نسخة محلية مولدة تلقائيًا (لا تُعدَّل)، **خ** = تخصيص الثيم.

| الصفحة | المسار (بعد `/{-$locale}`) | المصدر | Override في الثيم؟ | Override مخصص لاحقًا؟ | الملف / المكوّن | ملاحظات |
| --- | --- | --- | --- | --- | --- | --- |
| الرئيسية | `/` | ن | لا (البلوكات مسجلة في `router.tsx`) | نعم، عبر البلوكات لا المسار | `routes/index.tsx` + `components/home/*` | التخصيص عبر `registerHomeComponents` وليس بتعديل الملف |
| المنتج | `/$slug/p{$id}` | خ | نعم (Fork) | نعم (مهمة Product) | `routes/$slug.p$id.tsx` → `components/product/ProductPage.tsx` | يعتمد على Forks: Details وGallery وAddToCartForm |
| قائمة المنتجات / التصنيف | `/$slug/c{$id}` و`/products` | م | جزئيًا: `product:list-page` | نعم (مهمة Collections) | المحرك + `components/product/ProductListPage.tsx` | تحقق من أن `product:list-page` تُقرأ في 1.0.141 |
| العروض | `/offers` | م | لا | لا | المحرك | لم يُتحقق هل يمر عبر `product:list-page` |
| أحدث المنتجات | `/latest-products` | م | لا | لا | المحرك | |
| الأكثر مبيعًا | `/most-sales-products` | م | لا | لا | المحرك | |
| الوسم | `/$slug/tag-{$id}` و`/tags/$id` | م | لا | لا | المحرك | |
| البحث | `/search` | م | لا | نعم (Header Search) | المحرك | واجهة البحث في الهيدر (مهمة ٣) |
| السلة | `/cart` | خ | نعم (Fork) | نعم (مهمة Cart) | `routes/cart.tsx` → `components/cart/CartPage.tsx` | تعتمد على `CartItem` |
| الحساب (تخطيط) | `/account` | م | لا | لا | المحرك | مفتاح `account:layout-pending` مدعوم |
| الملف الشخصي | `/account/profile` و`/profile` | ن | لا | لاحقًا | `routes/account.profile.tsx` | |
| الطلبات | `/account/orders` و`/orders` | ن | لا | لاحقًا | `routes/account.orders.tsx` | |
| تفاصيل الطلب | `/account/orders/$id` و`/orders/$id` | ن | لا | لاحقًا | `routes/account.orders.$id.tsx` | في Twig أكبر قالب (45KB) |
| المفضلة | `/account/wishlist` و`/wishlist` | ن | لا | لاحقًا | `routes/account.wishlist.tsx` | |
| الإشعارات | `/account/notifications` و`/notifications` | ن | لا | لا | `routes/account.notifications.tsx` | |
| المحفظة | `/account/wallet` و`/wallet` | ن | لا | لا | `routes/account.wallet.tsx` | |
| الإعدادات | `/account/settings` | ن | لا | لا | `routes/account.settings.tsx` | |
| الطلبات المعلقة | `/account/pending_orders` و`/pending-orders` | م | لا | لا | المحرك | |
| التقييم | `/account/rating` و`/rating` | م | لا | لا | المحرك | |
| التقييمات | `/reviews` | م | لا | لا | المحرك | |
| الشكر بعد الطلب | `/thankyou/$orderId` | ن | لا | لاحقًا | `routes/thankyou.$orderId.tsx` | الأنماط موجودة في `tests/styles/thank-you-hero.test.ts` |
| المدونة | `/blog` | ن | لا | لا | `routes/blog.tsx` | |
| مقال | `/blog/$slug/a-{$id}` | ن | لا | لا | `routes/blog_.$slug.a-$id.tsx` | |
| تصنيف المدونة | `/blog/$slug/c-{$id}` | ن | لا | لا | `routes/blog_.$slug.c-$id.tsx` | |
| وسم المدونة | `/blog/$slug/tag-{$id}` | ن | لا | لا | `routes/blog_.$slug.tag-$id.tsx` | |
| كاتب المدونة | `/blog/author/$id` | ن | لا | لا | `routes/blog_.author.$id.tsx` | |
| الماركات | `/brands` | ن | لا | لا | `routes/brands.tsx` | |
| ماركة | `/$slug/brand-{$id}` و`/brands/$id` | ن + م | لا | لا | `routes/$slug.brand-$id.tsx` | |
| صفحة معلومات | `/$slug/page-{$id}` | خ | نعم (Fork) | لا | `routes/$slug.page-$id.tsx` → `components/page/PageSingle.tsx` | الصفحات `customised` تعرض الـHook فقط |
| آراء العملاء | `/testimonials` | ن | لا | لا | `routes/testimonials.tsx` | |
| الولاء | `/loyalty` و`/loyalty_points` | ن | لا | لا | `routes/loyalty.tsx`, `loyalty_points.tsx` | |
| تسجيل الخروج | `/logout` | ن | لا | لا | `routes/logout.tsx` | |
| التحويلات | `/redirect/$type/$id` | م | لا | لا | المحرك | |
| صفحة هبوط (Landing) | غير موجود | لا يوجد | لا | يُحسم لاحقًا | `landing-page.twig` في Twig | **غير محسوم:** هل تنتقل هذه الصفحة كمسار أم تبقى من لوحة سلة؟ |
| تسجيل الدخول / الدفع (Checkout) | خارج الثيم | منصة سلة | لا | لا | — | تُدار من سلة، لا تُبنى |

## ٣. تغطية صفحات Twig القديمة

كل قالب في `src/views/pages` له مقابل: `index` والمنتج والسلة والمدونة والماركات والحساب والولاء والـthank-you وآراء العملاء وصفحة المعلومات. الاستثناء الوحيد: `landing-page.twig` (غير محسوم، انظر الجدول).

## ٤. نقاط التخصيص المستقبلية

- أول ما يحتاج Override مخصص: المنتج (قائم)، السلة (قائمة)، قائمة المنتجات (قائمة عبر `registry`)، ثم صفحات الحساب إن لزم.
- أي مسار جديد: ممنوع تكراره إن كان المحرك يوفره. يُضاف `route()` في `app/routes.ts` فقط للنسخ المخصصة بلا العلامة `@auto-generated`.
- ما يُحسم في Self-QA: هل يظل `routes.ts` فارغًا وتعمل التخصيصات (cart/product/page) بمجرد وجود الملفات بلا علامة، كما هو ظاهر في `routeTree.gen.ts` الحالي؟ (الظاهر أنها تعمل؛ يُثبَّت بالتشغيل).

</div>
