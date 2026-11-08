# TALLAH React — Bug Tracker

آخر تحديث: بعد مرحلة Final Fixes (Build Candidate 1). المصدر: `docs/TALLAH_Full_Theme_Regression_Report.md` + هذه المرحلة.
الحالات: OPEN · IN PROGRESS · RESOLVED · NOT VERIFIED · DEFERRED.

## A. سجل الانحدارات
| Issue ID | Description | Severity | Status | Files Changed | Verification |
|---|---|---|---|---|---|
| ISSUE-01 | لا مؤشر تركيز للوحة المفاتيح (الأصل يعرّف `:focus-visible` عاماً) + `a:focus {outline:none}` كان يلغيه | Medium | **RESOLVED** | `app/styles/02-generic/reset.scss`, `tests/styles/focus-visible.test.ts` | متصفح: Tab وShift+Tab أظهرا outline 2px بلون primary + فجوة بيضاء؛ اختبار آلي (3) |
| ISSUE-02 | بعد فلتر ثم Back: الرابط يعود لكن القائمة/الخانة تبقيان مفلترتين | Medium | **RESOLVED** | `app/components/product/ProductListPage.tsx` | متصفح: فلتر (6→16) ← Back (6، بلا خانة) ← Forward (16، خانة) ← Back (6) |
| ISSUE-03 | النوافذ التسويقية للمنتج (إشعار التوفر + عرض التصنيف) غير منفّذة — 14 إعداداً بلا مستهلك | High | **RESOLVED** (إشعار التوفر: آلي فقط) | `app/components/product/ProductPromoPopups.tsx`, `ProductPage.tsx`, `tests/components/product/ProductPromoPopups.test.tsx` | نافذة التصنيف في المتصفح (≥600px، حوار، Esc، "لا تذكّرني" + إعادة تحميل)؛ نافذة التوفر 11 اختباراً (لا منتج نافد في الكتالوج) |
| ISSUE-04 | عنوان تصنيف "(٥)" مقابل 6 بطاقات | Low | **RESOLVED (غير قابل للتكرار)** | — | أُعيد القياس: العدّاد (6) = 6 بطاقات؛ القراءة السابقة كانت من لقطة منخفضة الدقة |
| ISSUE-05 | ارتفاع الهيدر 192px عند 1024 مقابل 146 في الأصل | Low | **RESOLVED (ليس عيباً)** | — | الـ 192 = شريط إعلان المتجر (46px) داخل غلاف الهيدر + الهيدر نفسه 146px = الأصل (الإعلان خارج `<header>` في الأصل) |
| ISSUE-06 | روابط القوائم/الاقتراحات مطلقة إلى `demostore.salla.sa` في المعاينة المحلية | Low | **DEFERRED** | — | رابط محرّك `Link` يعامل الروابط المطلقة كخارجية بالتصميم؛ على نطاق المتجر الفعلي نفس الأصل. إعادة كتابة عامة تحتاج معرفة قاعدة المتجر وقد تكسر روابط التاجر → غير مُنفَّذة عمداً |
| ISSUE-07 | الفوتر 479px مقابل 383px | Low | **RESOLVED (فرق محتوى لا بنية)** | — | البنية مطابقة (روابط مهمة، تواصل معنا، كتلة المتجر + الرقم الضريبي، تطبيق، مدفوعات)؛ الفرق من قيمة `newsletter_view` المفعّلة في المعاينة (شريط النشرة) ولون المتجر |

## B. مشاكل مكتشفة أثناء الإصلاح
| ID | Description | Severity | Status | Files | Verification |
|---|---|---|---|---|---|
| NEW-01 | الصفحة الرئيسية في المعاينة الإنتاجية (`vite preview`) تعرض تركيبة المتجر البعيد (بلوكات Raed التجريبية) لأن `twilight.preview.json` للتطوير فقط | High (للنشر) | **OPEN (تهيئة متجر)** | — | يجب ضبط الصفحة الرئيسية في لوحة سلة بالبلوكات الثمانية؛ لا يُحل بالكود |
| NEW-02 | القائمة الجوال لا تحمل `role="dialog"`/`aria-modal` | Low | OPEN | `app/components/layout/tallah/MobileMenu.tsx` | فحص DOM |

## C. فجوات ترحيل قائمة
| ID | Description | Severity | Status |
|---|---|---|---|
| GAP-01 | صفحات غير منقولة: العلامات التجارية، المدونة، الآراء، شكراً، الحساب، الولاء، الصفحات التعريفية (محتوى المحرك) | Medium | OPEN (نطاق مستقل) |
| GAP-02 | ملفات وCSS Raed ميتة غير مستوردة (`Header*`, `MobileBottomBar`, `MobileAccountSheet`, `ImportantLinksSheet`, `MobilePageTitleBar`) | Low | OPEN (تنظيف بموافقة) |
| GAP-03 | `squar_photo_bg_image_size` مُستهلَك، لكن الرئيسية الحالية لا تحوي بلوك الصور المربعة | Low | NOT VERIFIED على بلوك حقيقي |
| GAP-04 | `checkout_enable` غير مختبر في المتصفح | Low | NOT VERIFIED |

## D. قيود منصة/بيئة معروفة
- إتمام الطلب محجوب في المتجر التجريبي ("لا يمكن إتمام الطلب من متجر تجريبي"); استمرارية السلة عبر النطاقات غير قابلة للتحقق.
- لا كوبون صالح؛ لا منتج نافد/بحد أقصى في الكتالوج.
- حقل `header-topnav-count-down` نصّي بدل `date` (محرر React لا يدعم الصيغة)؛ تسميات المحرر عربية فقط.
- تحذير SDK `Offers is not a string`، وأخطاء hydration سببها إضافات المتصفح (`fdprocessedid`).
- الخط (Dubai) واللون الأساسي ومحتوى الأقسام في المعاينة = إعدادات المتجر التجريبي.
