<div dir="rtl">

# بنية مشروع طلة على Salla React

> المهمة: Set up architecture, routes, component map and core React starter structure.
> الحالة: مرحلة توثيق وتنظيم فقط. لم يُنقل أي Header أو Footer أو CSS من Twig.

## ١. ما هو المشروع فعلًا اليوم

- المشروع ليس Starter فارغًا. هو نسخة جاهزة من ثيم Raed React (يظهر ذلك في `FORKS.md` و`twilight.json`)، وعليها تخصيصات قائمة: Header كامل، شريط سفلي للجوال، بلوكات رئيسية مخصصة، صفحة منتج وسلة وقوائم منتجات.
- لذلك مهمة طلة هي تحويل هذا الأساس إلى هوية طلة، وليس بناء بنية من الصفر.
- الأدوات المثبتة (من `package.json` والـ`node_modules`):
  - `@salla.sa/twilight-theme-engine` ‏1.0.141 (النطاق المعلن `^1.0.127`).
  - `@tanstack/react-start` ‏1.168.61، و`react` ‏19.2.8، و`vite` ‏8.2.2، و`typescript` ‏6.x.
  - Tailwind 3.4 مع SCSS، والاختبارات بـ Vitest.
- Git: الفرع `main`، والـRemote هو `https://github.com/ecommerce-beep/Tallah-theme-React.git`، والشجرة نظيفة وقت الفحص.

## ٢. مسؤولية كل مجلد وملف

| المسار | المسؤولية | يُعدَّل؟ |
| --- | --- | --- |
| `app/start.ts` | Middleware الطلبات (`twilightMiddleware`, `earlyHintsMiddleware`) | نادرًا |
| `app/router.tsx` | إنشاء الـRouter، وتسجيل بلوكات الرئيسية، و`registry`، و`registerThemeHooks()` | نعم |
| `app/routes.ts` | Manifest المسارات المخصصة. فارغ حاليًا | نعم، عند إضافة مسار جديد فقط |
| `app/routes/__root.tsx` | الجذر: `TwilightProvider` و`ThemeLayout` والـCSS الحرج | نعم |
| `app/routes/*` | ملفات المسارات. الملفات التي تحمل `// @auto-generated` يعيد المحرك كتابتها | انظر `TALLAH_Routes_Map.md` |
| `app/routeTree.gen.ts` | مولَّد تلقائيًا (وهو داخل `.gitignore`) | لا |
| `app/components/layout/` | الهيدر والقوائم والشريط السفلي و`ThemeLayout` | نعم، في مهمة Header/Footer |
| `app/components/home/` | بلوكات الرئيسية المخصصة | نعم |
| `app/components/product/` | صفحة المنتج وبطاقة المنتج وقائمة المنتجات (Forks من المحرك) | نعم |
| `app/components/cart/` | السلة والتنبيه عند الإضافة (Forks) | نعم |
| `app/components/page/` | الصفحات المخصصة (Fork) | نعم |
| `app/components/common/` | مكونات مشتركة: Carousel وBottomSheet وBlockHookSlot | نعم |
| `app/components/icons.tsx` | الأيقونات | نعم |
| `app/hooks/` | React hooks، و`index.tsx` يسجل Hook Slots | نعم |
| `app/lib/` | دوال مساعدة غير React | نعم |
| `app/styles/` | Tailwind وSCSS بترتيب ITCSS (01 إلى 05)، وCSS حرج للرئيسية والمنتج | نعم |
| `app/types/` | تعريفات TypeScript محلية | نادرًا |
| `locales/{ar,en}.json` | ترجمات الثيم | نعم |
| `twilight.json` | إعدادات التاجر وبلوكات الرئيسية والـfeatures | نعم، ثم `pnpm check:manifest` |
| `public/` | ملفات ثابتة (`_headers` فقط حاليًا) | نعم |
| `tests/` | اختبارات Vitest تعكس بنية `app/` | نعم |
| `FORKS.md` | سجل المكونات المنسوخة من المحرك | يُحدَّث عند كل Fork |
| `docs/` | هذا التوثيق | نعم |

## ٣. ما يوفره المحرك وما يوفره الثيم

- المحرك يوفر تلقائيًا: كل مسارات المتجر الأساسية (انظر Routes Map)، و`TwilightProvider`، وتحميل البيانات، ومكونات Footer، ونظام Hooks والـSlots، وترجمات النظام.
- الثيم الحالي يضيف فوق المحرك:
  - Header مخصص كامل (`HeaderNav`, `HeaderMainMenu`, `HeaderTopnav`) وشريط سفلي للجوال وورقة الحساب.
  - بلوكات رئيسية مسجلة في `app/router.tsx` تحل محل بلوكات المحرك.
  - Forks لصفحة المنتج والسلة وقائمة المنتجات والصفحة المخصصة (مسجلة في `FORKS.md`).
- Footer: يُستخدم Footer المحرك مباشرة من `@salla.sa/twilight-theme-engine/layout`، وسيُقرَّر في مهمة Header/Footer هل يلزم Fork له.
- ما سنبنيه خصيصًا لطلة لاحقًا: هوية الهيدر والفوتر، وDesign Tokens، وبلوكات الرئيسية الخاصة بطلة.

## ٤. نقاط التسجيل (Registry) المعتمدة

- `registry.register('product:list-page' ...)` و`'product:list-skeleton'` موجودان في `app/router.tsx`.
- تنبيه: إرشادات المشروع (`AGENTS.md`) تقول إن المفاتيح المعتمدة هي `product:card` وبلوكات `home:*` و`account:layout-pending` فقط. لم نتحقق من أن `product:list-page` تُقرأ فعلًا في نسخة المحرك 1.0.141، ويجب فحص ذلك في Self-QA. لا تعديل الآن.
- بلوكات الرئيسية: تُربط بالمفتاح عبر `registerHomeComponents({ ...DefaultHomeComponents, ... })`، والـspread محفوظ. المفاتيح ذات `view_style` مسجلة بالصيغتين (`featured-products` و`featured-products:styleN`).
- Hooks: `registerThemeHooks()` تسجل `AddProductToast` في `BODY_END` و`DigitalFilesSettings` في `PRODUCT_DESCRIPTION`.

## ٥. أماكن العمل القادمة

| العمل | المكان |
| --- | --- |
| Header (مهمة ٣) | `app/components/layout/Header*.tsx`، وأنماطه في `app/styles/04-components/header.scss` و`menus.scss` |
| Footer (مهمة ٣) | الأنماط في `app/styles/04-components/footer.scss`؛ إن لزم Fork يوضع في `app/components/layout/Footer.tsx` ويُسجَّل في `FORKS.md` ويُمرَّر من `ThemeLayout.tsx` |
| Design Tokens | `app/styles/01-settings/global.scss` ومتغيرات الألوان والخطوط، مع `tailwind.config.cjs` وإعدادات `color` و`fonts` في `twilight.json` |
| بلوك رئيسية جديد | ملف في `app/components/home/` + تسجيل في `app/router.tsx` + تعريف في `twilight.json` |
| صفحة جديدة | `route()` في `app/routes.ts` + ملف في `app/routes/` |
| ترجمات | `locales/ar.json` و`locales/en.json` معًا |
| أصول Twig (صور) | `public/` أو استيراد داخل `app/` حسب الاستخدام |

## ٦. قرارات Architecture

1. **الإبقاء على البنية الحالية دون إعادة تنظيم.** المجلدات منظمة حسب الدومين (cart, home, product, layout, common) وتتوافق مع دليل Salla الرسمي، ولا يوجد تعارض مؤكد.
2. **لا مكونات فارغة ولا مجلدات جديدة.** كل مجلد مستقبلي (مثل `account` أو `blog`) يُنشأ عند أول مكون فعلي فقط.
3. **مسارات المحرك تبقى للمحرك.** لا نستبدل صفحة إلا بضرورة موثقة، والمسارات المخصصة الحالية (المنتج، السلة، الصفحة المخصصة) موروثة من Raed ومبررة في `FORKS.md`.
4. **ملفات المسارات التي تحمل `// @auto-generated` لا تُعدَّل.** أي تخصيص لها يتم بنسخها إلى ملف جديد بلا العلامة مع `route()` في `app/routes.ts`.
5. **الأسلوب البصري يبقى SCSS + `@apply`** كما هو في الثيم، دون إدخال نظام تنسيق ثانٍ.
6. **العربية أولًا.** أي نص جديد يُضاف بالعربية والإنجليزية معًا، وبخصائص CSS المنطقية (`ms-*`, `ps-*`, `text-start`).
7. **لا نكرر ما يوجد في المحرك.** قبل أي مكون جديد نراجع توثيق `docs.salla.dev/twilight/react`.

## ٧. ما عُدِّل في هذه المهمة

- أُنشئت ملفات التوثيق الثلاثة داخل `docs/` فقط:
  - `docs/TALLAH_React_Architecture.md`
  - `docs/TALLAH_Routes_Map.md`
  - `docs/TALLAH_Component_Migration_Map.md`
- لم يُعدَّل أي ملف كود أو إعدادات، لأن البنية الحالية سليمة ولم يُرصد تعارض هيكلي مؤكد.
- لم يُنفَّذ Commit ولا Push ولا نشر. لم يُلمس مجلد Twig ولا أي مستودع آخر.

## ٨. نتائج الفحوصات (قبل أي تعديل، والتعديل الوحيد هو إضافة `docs/`)

| الفحص | النتيجة |
| --- | --- |
| `pnpm typecheck` | ينجح، بلا أخطاء |
| `pnpm check:manifest` | ينجح: 0 أخطاء و0 تحذيرات |
| `pnpm build` | ينجح (17 ثانية تقريبًا) |
| `pnpm test` | **يفشل اختباران من 436** (قائمان في Starter قبل عملنا) |

الاختباران الفاشلان:

1. `tests/components/layout/MobileAccountSheet.test.tsx`: «shows the placeholder while the menu has no rows, and hides it once they arrive».
2. `tests/components/product/ProductDetails.test.tsx`: «SKU row shows the product SKU when no live SKU is passed» (القيمة المتوقعة `PARENT` وجاءت `null`).

لم تُبحث أسبابهما ولم يُصلحا، لأنهما خارج نطاق هذه المهمة ويُعالجان في Self-QA.

## ٩. ملاحظات وبنود غير محسومة

- **مسار الثيم القديم:** الموجود فعليًا هو `C:\Users\abdelrahman\Desktop\arabybrand\TALLAH-fork`، أما `C:\Users\abdelrahman\Desktop\TALLAH-fork` فغير موجود. قُرئ المسار الأول للقراءة فقط.
- **بقايا Raed في الثيم:** `twilight.json` يحمل `"name": "TALLAH React"` لكن `repository` ما زال `SallaApp/theme-raed-react`، و`FORKS.md` يصف التعديلات بأنها لـ Raed. يُنظَّف لاحقًا بقرار من المدير.
- **ترميز النصوص:** ظهرت النصوص العربية مشوهة عند القراءة الافتراضية عبر PowerShell، لكن القراءة بـ UTF-8 أثبتت أن الملفات سليمة (تم التحقق من `twilight.json` و`router.tsx` و`locales/ar.json`). المشكلة في عرض الطرفية فقط.
- **`.env`:** موجود ومتجاهَل في Git، ويحدد `VITE_STORE_DOMAIN`. لم تُقرأ قيمته.
- **`app/routes/.gitkeep`** موجود بجانب ملفات حقيقية؛ غير ضار.

</div>
