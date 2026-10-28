# PDR — Retro Browser Gaming Platform

**سند الزامات توسعه محصول و قرارداد اجرایی Agent**  
**شناسه:** RBG-PDR-001  
**نسخه:** 1.0 — 2026-10-18  
**زبان سند:** فارسی؛ اصطلاحات فنی و شناسه‌های تست انگلیسی  
**وضعیت:** Approved for agent execution only after owner hands this document to the agent  
**Stack:** Django + DRF + PostgreSQL + Next.js App Router + TypeScript + PWA + S3-compatible Object Storage + WebAssembly Emulators  
**هدف:** پیاده‌سازی End-to-End و تحویل نسخه واقعاً اجراشونده؛ نه صرفاً صفحات ظاهری، Stub، Mock یا پاس شدن تست‌های صوری.

---

## 0. نحوه استفاده توسط Agent — از اینجا شروع کن

> **Execution directive:** تو به‌عنوان Senior Software Engineer، Tech Lead، QA Engineer و DevOps Engineer مجاز به تصمیم‌گیری‌های فنی داخل محدوده این PDR هستی. محصول را از ابتدا تا خروجی نهایی بساز؛ هر فاز را به‌صورت کامل تست کن و فقط بعد از عبور از Gate آن وارد فاز بعد شو. برای تصمیم‌های جزئی از کارفرما سؤال نکن؛ از سیاست تصمیم‌گیری §2 استفاده کن. وجود مانع غیرقابل‌حل یا نیاز به دارایی دارای مجوز را پنهان نکن و هیچ قابلیتی را بدون اثبات «انجام‌شده» اعلام نکن.

### 0.1 قوانین غیرقابل مذاکره

1. پیش از تغییر، وضعیت Repository، فایل‌های موجود، دستورات پروژه، Branch، محیط و Test Suite را بررسی کن؛ بدون علت موجه چیزی را حذف یا از نو ایجاد نکن. اگر Repository خالی است از ساختار پیشنهادی §10 استفاده کن.
2. اجرای بازی باید **روی دستگاه کاربر در مرورگر** باشد؛ Streaming تصویر از سرور، Remote GPU و شبیه‌سازی Backend مجاز نیست.
3. دانلود و اجرای آفلاین دو قابلیت واقعی و اجباری‌اند؛ نمایش Progress جعلی، فایل Fake، ثبت Completion قبل از تأیید Checksum و `fetch()` از شبکه در Offline ممنوع است.
4. نسخه دمو احراز هویت، پرداخت، DRM و کنترل دسترسی per-user ندارد؛ اما امنیت پایه، اعتبارسنجی ورودی‌ها، مدیریت خطا، حفاظت از Secrets و مجوزهای نشر اجباری است.
5. منبع هر ROM، BIOS، Artwork، Build شبیه‌ساز و وابستگی باید مشخص و از نظر مجوز قابل استفاده باشد. **هیچ فایل بازی/BIOS دارای حق نشر را بدون احراز مجوز وارد Repository، Bucket یا Fixture نکن.**
6. PS2 صرفاً Experimental/PoC است؛ عدم موفقیت PS2 انتشار دمو را مسدود نمی‌کند. Sega، PS1، PSP و HTML5 در Scope اصلی‌اند، با Gate واقعی سازگاری PSP.
7. طراحی فقط برای Chrome Desktop نباشد؛ Mobile-first و تست Browser Compatibility و Keyboard/Gamepad/Touch لازم است.
8. به‌جای استفاده از APIهای خصوصی/ناپایدار هسته‌ها، Adapter مستقل و نسخه‌بندی‌شده بساز. تغییر Emulator Core باید محدود به همان Adapter بماند.
9. وابستگی‌ها نسخه‌بندی و Lock شوند؛ استفاده از `latest` در Runtime/Production ممنوع، و انتشار فایل‌های Core از CDN ثالث بدون کنترل نسخه ممنوع است.
10. در پایان هر فاز، کد، تست‌ها، شواهد، گزارش تست، محدودیت‌ها و Commit ثبت شود. اگر ابزار Git موجود بود Commitهای قابل ردیابی انجام بده؛ هیچ Test Failure را با Skip بی‌دلیل پنهان نکن.
11. اگر توانایی تست سخت‌افزار یا Browser واقعی وجود ندارد، آن را `NOT_VERIFIED` ثبت کن؛ Playwright Mobile Emulation معادل آزمایش روی گوشی واقعی نیست.
12. اگر شرط اصلی با فناوری انتخاب‌شده قابل اجرا نبود، اول تحقیق و Spike مستند انجام بده، سپس Adapter/روش جایگزین آزموده انتخاب کن؛ هرگز وانمود نکن که قابلیت کار می‌کند.

### 0.2 خروجی‌های الزامی

- Repository مرتب و قابل اجرا با `docker compose up --build` و دستورهای توسعه محلی مستقل.
- Backend واقعی Django/DRF، DB، Django Admin و API نسخه‌دار.
- Frontend واقعی Next.js با PWA و UI Responsive به سبک Retro 16-bit مدرن.
- Emulator Adapterهای واقعی با اثبات اجرای بازی‌های مجاز تست برای پلتفرم‌های اصلی؛ Experimentalها جداگانه.
- سیستم دانلود resumable با OPFS، وضعیت IndexedDB، اعتبارسنجی کامل و قابلیت اجرای آفلاین.
- تنظیم و ذخیره کنترل‌های Touch/Keyboard/Gamepad و Saveهای پشتیبانی‌شده.
- فایل‌های `.env.example`، `README.md`، `docs/architecture.md`، `docs/deployment.md`، `docs/browser-support.md`، `docs/compatibility-matrix.md`، `docs/licenses-and-assets.md`، `docs/test-evidence.md`، `docs/known-limitations.md`، `docs/final-handover.md`.
- تست‌های Backend/Frontend/Unit/Integration/E2E/Offline/Failure Recovery؛ خروجی CI و Logs بدون Secrets.
- صفحه راهنمای کاربر برای دانلود، ادامه دانلود، فضای ذخیره، Offline و محدودیت مرورگر.

---

## 1. Product Vision، کاربران و ارزش

### 1.1 مسئله

کاربر می‌خواهد از آرشیو بازی‌های کلاسیک و بازی‌های HTML5، بدون نصب شبیه‌ساز یا اپلیکیشن بومی، در مرورگر Desktop و Mobile بازی کند. پس از دانلود اولیه بازی و منابع اجرای آن، لازم است بازی آفلاین باز شود. پلتفرم باید پیش از دانلود قابلیت‌های مرورگر/دستگاه را بررسی کند؛ نحوه کنترل را با دستگاه تطبیق دهد؛ ذخیره بازی‌ها را مدیریت کند.

### 1.2 هدف محصول

ساخت **Browser-Based Retro Game Launcher** با یک تجربه یکپارچه برای Discovery → Compatibility Check → Download → Verify → Install Offline → Play → Save → Return Offline.

### 1.3 کاربران هدف

- کاربر دسکتاپ: Keyboard و Gamepad، نمایش افقی، تمام‌صفحه، آرشیو قابل جست‌وجو.
- کاربر موبایل/تبلت: Touch Overlay قابل سفارشی‌سازی، Gamepad بلوتوث در صورت پشتیبانی، مدیریت فضای ذخیره.
- مدیر محتوا: افزودن Console، Game، Asset، تصاویر، وضعیت انتشار و تست سازگاری از Django Admin.

### 1.4 شاخص‌های موفقیت (قابل اندازه‌گیری)

- E2E: کاربر ناشناس یک بازی مجاز را انتخاب، واقعاً دانلود، Verify و Launch می‌کند؛ دوباره با شبکه قطع‌شده همان بازی را اجرا می‌کند.
- Download Recovery: فایل حداقل 100MiB مصنوعی قانونی با قطع دانلود و بسته/باز شدن Context کامل و Byte-for-byte صحیح بازیابی می‌شود. از داده مصنوعی deterministic استفاده کن؛ برای شبیه‌سازی ROM بزرگ از داده کاذب در تست دانلود استفاده کن، نه از بازی جعلی.
- Console: حداقل یک ROM مجاز برای **Sega Mega Drive یا Master System** و یک ROM مجاز برای **PS1** در مرورگر واقعی Boot و Gameplay اثبات‌شده داشته باشند؛ **PSP** نیز پس از Gate اختصاصی با نمونه مجاز راه‌اندازی و FPS/رفتار ثبت شود. اگر PSP به مانع مستند سخت‌افزاری/حافظه برخورد، بدون ادعای تکمیل، این مورد به‌عنوان Blocker محصول اصلی گزارش شود.
- UI: وظایف اصلی با Mouse/Keyboard و Mobile Touch قابل انجام باشند. هیچ دکمه تزئینی/بی‌عمل باقی نماند.
- Offline: حداقل سه بار Reload/بازگشایی مستقل با Network Offline روی مرورگر هدف موفق شود؛ UI، Emulator WASM و بازی آماده نباید از API/S3/CDN درخواست لازم داشته باشند.
- Integrity: هیچ Chunk ناقص/تغییر یافته‌ای به‌عنوان Installed تأیید نشود؛ حذف تصادفی یا کاهش Quota موجب Crash یا از دست دادن Saveهای سالم نشود.

---

## 2. سیاست تصمیم‌گیری مستقل و محدودیت‌های Autonomy

**هدف بدون نظارت:** Agent باید برای موارد عادی تصمیم بگیرد و منتظر بازخورد انسانی نماند. بااین‌حال مجوز ROM/BIOS، Secrets سرویس‌های واقعی، دستگاه‌های فیزیکی و انتشار روی زیرساخت شخص ثالث را نمی‌توان اختراع کرد. عدم دسترسی به این موارد باید با اجرای گزینه‌های محلی و گزارش دقیق مدیریت شود.

**اولویت تصمیم‌ها:** (1) صحت واقعی و حقوق نشر، (2) نیازمندی الزامی، (3) تست قابل تکرار، (4) امنیت و پایداری، (5) تجربه کاربری، (6) بهینه‌سازی.

**مجاز بدون سؤال:** انتخاب نسخه stable سازگار، نام پکیج، ORM/Serializer، انتخاب CSS utility، تنظیم Worker، پوشه‌ها، Migration، UI جزئی، Refactor، جایگزینی کتابخانه آزمایشی با گزینه مستند و تست‌شده، تنظیمات Docker محلی، بازی Homebrew دارای مجوز انتشار شفاف.

**غیرمجاز:** استفاده از BIOS/ROM تجاری بدون حق انتشار، دور زدن محدودیت‌های مرورگر، انتشار مستقیم اینترنتی بدون Credentials و مجوز، ادعای تست روی گوشی واقعی بدون دستگاه، تغییر یا حذف اطلاعات Repository نامرتبط، جعل گزارش موفقیت.

**اگر ROM واقعی شرکت هنوز موجود نیست:** (a) کتابخانه را با یک بازی HTML5 که خود Agent می‌سازد و داده‌های Metadata/Placeholder قانونی بالا بیاور، (b) برای تست Core تنها از نمونه‌های Homebrew/آزاد با مجوز معتبر و مدرک URL+SHA256 استفاده کن، (c) Fixtureهای دانلود را از بایت مصنوعی تولید کن، (d) اگر برای PS1/PSP نمونه مجاز پیدا نشد، Test را به حالت `BLOCKED_EXTERNAL_ASSET` ثبت کن، نه `PASSED`، (e) Workflow واردکردن فایل مجاز از Django Admin و ابزار CLI را آماده تحویل کن.

**اگر S3 خارجی موجود نیست:** محیط Local با S3-compatible Development Object Store ایجاد کن و تمام سناریوها را محلی اثبات کن. مقادیر Production از ENV خوانده شود.

**اگر گوشی یا دسته فیزیکی در محیط Agent نیست:** تست E2E با Emulation/Virtual Input را انجام بده ولی ستون Physical Verification را `NOT_VERIFIED` بگذار، و Runbook دقیق تست دستی ارائه کن.

**اگر یکی از Gateهای اجباری شکست خورد:** حداکثر با راه‌حل جایگزین سازگار و مستند ادامه بده؛ خطا را با Flag پنهان یا Mock جایگزین نکن. وضعیت پایانی تحویل باید `PASSED`، `BLOCKED_EXTERNAL` یا `FAILED` برای هر معیار باشد؛ `PASSED` جعلی ممنوع.

---

## 3. Scope و پلتفرم‌ها

### 3.1 P0 — Required Demo

| Family | System | Candidate Engine | Rule |
|---|---|---|---|
| Browser | HTML5 self-contained games | Native JS/Canvas/WebGL | الزام اجرا و Offline |
| Sega | Mega Drive / Genesis | EmulatorJS / Genesis Plus GX | الزام اجرای یک ROM مجاز |
| Sega | Master System | SMS Plus | الزام Adapter و تلاش برای ROM تست |
| Sega | Game Gear | Genesis Plus GX | الزام Adapter و تلاش برای ROM تست |
| Sony | PS1 | EmulatorJS / PCSX ReARMed | الزام اجرای یک ROM مجاز، BIOS قانونی در صورت نیاز |
| Sony | PSP | EmulatorJS PPSSPP (threaded) یا Adapter مستقلِ تأییدشده | الزام Spike مستقل، آزمون واقعی روی مرورگر واجد شرایط |

**منظور از Family اصلی** توانایی بازی کردن روی حداقل یک ترکیب دستگاه/مرورگر پشتیبانی‌شده، نه اجرای همه ROMها یا همه گوشی‌ها. محدودیت‌های هر ROM باید در Compatibility Matrix قابل رؤیت باشند.

### 3.2 P1 — Expansion-ready, optional implementation بعد از P0

Sega CD، Sega 32X، NES/Famicom، SNES، Game Boy، Game Boy Color، GBA، Atari 2600/5200/7800/Lynx/Jaguar، Neo Geo، PC Engine، MS-DOS، Commodore 64، Neo Geo Pocket، WonderSwan، 3DO، Arcade (FBNeo/MAME)، N64، Nintendo DS و Sega Saturn. برای هر کدام Registry/Metadata/Feature Flag قابل تعریف است، اما اضافه شدن آن نباید P0 را مخدوش کند.

### 3.3 P2 — Experimental Research

PS2/Play! Web، Dreamcast/Flycast WASM، Nintendo 3DS/Azahar Web، GameCube/Wii مرورگری، و پلتفرم‌های خاص تاریخی. PS2 باید تنها یک PoC مستقل، با Test Evidence واقعی و Flag غیرفعال برای Catalog عمومی، داشته باشد. سیستم‌های فاقد راه‌حل مناسب نباید به اشتباه `supported=true` شوند.

### 3.4 Out of scope

حساب/ورود، پرداخت، پنل کاربری Cloud، Sync بین دستگاه‌ها، Cloud Save، Netplay، Multiplayer Online، Remote streaming، توصیه‌گر AI، Ratings/Comments، آپلود ROM عمومی کاربران، DRM، فروش بازی، دانلود ادامه‌دار قطعی در حالت کاملاً بسته بودن مرورگر، اجرای قابل اتکای PS2 برای عموم کاربران، تضمین همه مرورگرها برای PSP.

---

## 4. نیازمندی‌های محصول (Functional Requirements)

**تفسیر اولویت:** MUST = Gate اجباری، SHOULD = بعد از MUST اگر منابع فراهم بود، EXPERIMENTAL = نتیجه مستند بدون تضمین تحویل.

### 4.1 Catalog و Discoverability

- **FR-CAT-01 MUST:** صفحه Home، All Games، Console Filters، Search، Game Details، My Library، Downloads، Settings، Player، Offline Fallback، 404/Error.
- **FR-CAT-02 MUST:** صفحه بازی: کاور، نام، خلاصه، ژانر، تاریخ/ناشر (در صورت اطلاعات معتبر)، کنسول، فرمت، حجم دقیق، وضعیت انتشار، BIOS required، Emulator requirements، Compatibility status، دکمه Download/Resume/Play/Delete.
- **FR-CAT-03 MUST:** جست‌وجو و فیلتر backend-based؛ pagination؛ Empty/Loading/Error states؛ URL shareable برای جزئیات؛ SEO پایه برای بازی‌های منتشرشده.
- **FR-CAT-04 MUST:** Offline Library با اطلاعات Cacheشده و بدون فراخوانی اجباری Backend.
- **FR-CAT-05 SHOULD:** Recently Played و Favoriteها به‌صورت محلی و بدون Login.

### 4.2 Compatibility

- **FR-COMP-01 MUST:** Capability Check: secure context، WASM، threads/SharedArrayBuffer/crossOriginIsolated، WebGL2 (و نسخه جایگزین در صورت هسته)، Gamepad support، Touch، Storage estimate، quota، Optional WebGPU (فقط اگر هسته نیاز دارد)، Browser version family و platform support.
- **FR-COMP-02 MUST:** Compatibility Result = `compatible | limited | unsupported | unknown` همراه با علل و سطح اطمینان؛ صرف user-agent، حافظه و CPU برای تأیید کفایت نمی‌کند.
- **FR-COMP-03 MUST:** حداقل یک benchmark کوتاه کالیبره‌شده در Worker برای عملکرد تقریبی، غیرمزاحم، با امکان skip؛ بعد از اجرا از Telemetry محلی/نتیجه واقعی برای بهبود اعلام وضعیت استفاده کن. بازه تست UX ترجیحاً زیر 10 ثانیه باشد.
- **FR-COMP-04 MUST:** شروط قطعی وابسته به Core: PSP به threading و cross-origin isolation واقعی نیاز دارد؛ حالت ناسازگار توضیح داشته باشد.
- **FR-COMP-05 MUST:** در وضعیت `unknown/limited` امکان «با آگاهی امتحان کن» وجود داشته باشد؛ `unsupported` فقط وقتی قابلیت لازم به‌طور قطعی نیست مانع اجرای همان Core شود.
- **FR-COMP-06 MUST:** نتیجه هر بازی شامل سازگاری شناخته‌شده ROM + نسخه Core جدا از Device Capability باشد؛ هیچ FPS تضمینی براساس heuristic ادعا نشود.

### 4.3 Download Manager

- **FR-DL-01 MUST:** دریافت Asset Manifest، تأیید هویت نسخه، اندازه و SHA-256؛ دانلود Range-based به قطعات تنظیم‌پذیر (پیش‌فرض 8MiB با تطبیق به دستگاه/شبکه).
- **FR-DL-02 MUST:** Pause، Resume، Retry با exponential backoff محدود، Cancel، Delete، Queue، نمایش Progress دقیق، bytes، speed smoothed، ETA تخمینی با برچسب تخمینی.
- **FR-DL-03 MUST:** ادامه دانلود بعد از Reload، خروج از سایت، بسته و باز شدن Browser؛ فقط قطعات سالم قبلی بازیابی شوند.
- **FR-DL-04 MUST:** مدیریت Responseهای `206`، `200` نامنتظر، `416`، `403/404`، timeout، قطع شبکه، ETag/Version mismatch، Content-Range غلط، Chunk ناقص و QuotaExceeded.
- **FR-DL-05 MUST:** فایل‌های حجیم به صورت streaming و chunked نوشته شوند؛ Download Manager نباید برای یک ISO چندگیگابایتی الزاماً `arrayBuffer()` کل فایل بسازد.
- **FR-DL-06 MUST:** داده معتبر در OPFS (یا fallback ارزیابی‌شده) و متادیتا در IndexedDB ذخیره شود؛ در نبود OPFS و نبود fallback قابل اتکا، دانلود آفلاین صادقانه Unsupported نمایش داده شود.
- **FR-DL-07 MUST:** کنترل Integrity فایل کامل، با SHA-256 stream-based یا chunked implementation معتبر؛ برای فایل‌های بزرگ RAM usage قابل قبول بماند.
- **FR-DL-08 MUST:** محافظت از اجرای هم‌زمان یک دانلود توسط چند Tab/Worker (Web Locks API یا lease اتمیک در IndexedDB)، و recovery پس از crash.
- **FR-DL-09 MUST:** بررسی فضای موجود با `navigator.storage.estimate()` و درخواست اختیاری `persist()`؛ قبل از دانلود فضای کافی/ناشناخته اعلام شود؛ فضای Checksum/Temp و ذخیره‌های بازی لحاظ شود.
- **FR-DL-10 MUST:** در حالت بستن کامل Browser دریافت شبکه لزوماً ادامه نخواهد داشت؛ فقط Resume هنگام بازگشت تعهد می‌شود. Background Fetch اختیاری و feature-detected است.
- **FR-DL-11 MUST:** دانلود Asset جدید باعث حذف Saveهای نسخه قبل نشود؛ ROM Downloaded، Verified، Installed و Playable چهار وضعیت مستقل‌اند.
- **FR-DL-12 SHOULD:** تنظیم سقف Concurrent Downloads (پیش‌فرض 2) و تعداد Range Requestهای هر فایل (پیش‌فرض 2)، قابل کاهش برای Mobile.

### 4.4 Local Library، PWA و Offline

- **FR-OFF-01 MUST:** Service Worker با Installable PWA Manifest، Icons 192/512، Start URL، Display Mode، Offline Navigation.
- **FR-OFF-02 MUST:** Assets ضروری App Shell، JS/CSS مرتبط، WASM/JS Core نسخه‌بندی‌شده و Game Data لازم پیش از اعلام `Ready Offline` Cache/Store شده باشند؛ فایل ROMهای حجیم در Cache Storage دوباره کپی نشوند.
- **FR-OFF-03 MUST:** My Library، Player و Settings بدون Backend موجود باشند؛ توضیحات/کاور موردنیاز محلی ذخیره شده باشند.
- **FR-OFF-04 MUST:** `Ready Offline` فقط با Presence + Integrity محتوای بازی، Core/BIOS مجاز و ضروری، و Shell فعال نمایش داده شود.
- **FR-OFF-05 MUST:** Update Strategy هسته و SW مانع بازی در حال اجرا نشود؛ ترجیحاً نسخه جدید بعد از Exit فعال شود؛ Save migration پشتیبانی و rollback قابل بررسی باشد.
- **FR-OFF-06 MUST:** اگر Browser داده را Evict کرد یا کاربر Site Data را پاک کرد، تشخیص Lost Install و پیشنهاد Re-download نمایش داده شود؛ برنامه نباید Crash کند.
- **FR-OFF-07 MUST:** PWA Install اختیاری؛ اجرا در Browser معمولی بدون Install نیز باید کار کند.

### 4.5 Emulator Runtime

- **FR-EMU-01 MUST:** Registry + `EmulatorAdapter` با Lifecycle مستند، Input Surface، Asset Resolver، BIOS Handling، Core capabilities، Error codes، cleanup.
- **FR-EMU-02 MUST:** Launch دانلود آفلاین از OPFS با مسیر قابل تست. راهکار کوچک با Blob URL مجاز است، اما برای ISO چندگیگابایتی ابتدا PoC بخوان/seek و Memory Benchmark لازم است؛ در صورت نیاز Virtual FS/streaming filesystem سازگار با Core توسعه بده.
- **FR-EMU-03 MUST:** `init / load / play / pause / resume / reset / exit / dispose` واقعاً عملیاتی؛ تنها قابلیت‌های پشتیبانی‌شده نمایش داده شوند.
- **FR-EMU-04 MUST:** Fullscreen، ratio صحیح (4:3 برای بیشتر سیستم‌های کلاسیک، profile-specific در صورت نیاز)، صوت، کنترل volume/mute، loading و error states.
- **FR-EMU-05 MUST:** BIOS مستقل از ROM در Manifest با شرط License/Region و hash صحیح؛ BIOS ناشناس/غیرقانونی خودکار دانلود نشود. امکان provisioning مجاز در Admin.
- **FR-EMU-06 MUST:** Game/Emulator Core Version Pinning؛ Core Package و منابع JS/WASM از مبدأ نسخه‌بندی‌شده و قابل Cache؛ با هسته غیرمجاز یا ناشناس شروع نشود.
- **FR-EMU-07 MUST:** جلوگیری از نشتی Memory/Worker/Event listener هنگام خروج یا تعویض بازی.
- **FR-EMU-08 MUST:** پیش از ارائه پشتیبانی PSP اثبات کن: Core threaded روی HTTPS+COOP/COEP Boot می‌شود، Asset محلی load می‌شود، game-play واقعی رخ می‌دهد و محدودیت حافظه ثبت شده است.
- **FR-EMU-09 EXPERIMENTAL:** PoC مستقل PS2 بدون اتصال به مسیر حیاتی Player.

### 4.6 Input و کنترل مجازی

- **FR-IN-01 MUST:** Keyboard mapping و Gamepad API با mapping استاندارد و fallback برای دسته ناشناخته؛ اتصال/قطع دسته بدون Crash.
- **FR-IN-02 MUST:** دکمه‌های لمسی با multi-touch و pointer event، D-Pad، A/B/X/Y/Start/Select، L/R و Analogs در صورت نیاز Core.
- **FR-IN-03 MUST:** Touch Layout Editor با drag، resize، opacity، restore defaults، reset per-system، orientation-specific layout و Save در IndexedDB.
- **FR-IN-04 MUST:** مرزهای حرکت امن و جلوگیری از قرارگرفتن دکمه زیر notch/navigation یا خارج viewport؛ orientation switch و responsive.
- **FR-IN-05 MUST:** Runtime event mapping به Port/Player 1؛ Test input injection، debounce/release و عدم گیر کردن دکمه پس از blur/visibilitychange.
- **FR-IN-06 MUST:** ورودی Mouse فقط در بازی‌ها/هسته‌های سازگار؛ عدم ادعای کنترل Mouse عمومی در تمام کنسول‌ها.
- **FR-IN-07 SHOULD:** Import/Export کنترل‌های شخصی‌سازی‌شده JSON با اعتبارسنجی Schema.

### 4.7 Saves

- **FR-SAVE-01 MUST:** پشتیبانی Save RAM/SRAM/Memory Card و Save State فقط در Coreهای قادر؛ جداسازی `gameId + coreId + coreVersion + saveType + slot`.
- **FR-SAVE-02 MUST:** File/DB Storage Durable و بازیابی پس از Browser Restart/Offline و قطع غیرمنتظره صفحه.
- **FR-SAVE-03 MUST:** Backup/Export و Import با بررسی Schema/Version/Checksum برای حداقل یک Core اصلی؛ بدون overwrite اشتباه.
- **FR-SAVE-04 MUST:** عدم حذف Saveها هنگام حذف ROM مگر با تأیید صریح؛ UI توضیح تفاوت Delete Game / Delete Save.
- **FR-SAVE-05 SHOULD:** Autosave و slots در هسته‌های سازگار؛ هیچ قابلیت Saves جعلی در UI.

### 4.8 Django Admin و مدیریت محتوا

- **FR-ADM-01 MUST:** Create/Read/Update/Publish/Unpublish کنسول، بازی، Release، Asset، Emulator Core/Profile، artwork و compatibility verdict.
- **FR-ADM-02 MUST:** ابزار seed idempotent و import manifest با dry-run، validation و log.
- **FR-ADM-03 MUST:** نمایش `license_status`، `asset_provenance_url`، `sha256`، `byte_size`، `region`، `required_bios` و `core_version`.
- **FR-ADM-04 MUST:** Asset بدون License Approved یا بدون SHA-256 نباید در Catalog عمومی Published/Downloadable شود.
- **FR-ADM-05 MUST:** بازی‌های در وضعیت experimental/unsupported با Label صادقانه یا مخفی باشند.

---

## 5. Non-functional Requirements

- **NFR-PERF:** صفحه Catalog و تعاملات UI باید روی دستگاه میان‌رده Responsive باشند؛ CPU/GPU emulation از Main Thread تا حد امکان جدا شود؛ Long Task و Main Thread jank در Player اندازه‌گیری و ثبت گردد.
- **NFR-MEM:** دانلود حجیم نباید Memory برابر با کل فایل مصرف کند؛ برای فایل مصنوعی 1GiB تست Stress/Heap و write streaming انجام شود. PSP را با memory profiling واقعی تست کن؛ بدون دسترسی به RAM API رسمی ادعای تشخیص دقیق RAM ممنوع.
- **NFR-SEC:** HTTPS (به‌جز localhost)، CORS محدود به Originهای مجاز، COOP/COEP مناسب Threading، CSP سازگار و تا حد امکان سختگیرانه، File Validation، عدم XSS در HTML5 Games، عدم Secrets سمت Client، Error Message امن، Rate Limit endpointهای مدیریتی در production، Django security checks.
- **NFR-RELIABILITY:** وضعیت‌های دانلود Crash-safe، idempotent و recoverable؛ مهاجرت IndexedDB و DB تست شوند.
- **NFR-ACCESSIBILITY:** WCAG 2.2 AA برای کنترل‌های اصلی و Navigation تا حد عملی؛ Focus visible، keyboard navigation، contrast متناسب، Reduced Motion و سایز Touch Targets مناسب.
- **NFR-PORTABILITY:** Docker Compose لوکال و تنظیمات ENV؛ Browser Matrix در §18.
- **NFR-LEGAL:** Publish/Distribute فقط با حقوق نشر/مجوز مناسب؛ نگهداری Third-Party Notices و SPDX/attribution.
- **NFR-OBS:** Log ساختاریافته با correlation/request-id، ثبت Error بدون محتوای بازی یا داده حساس، صفحه تشخیص وضعیت Device و فهرست محدودیت‌ها.
- **NFR-MAINTAINABILITY:** TypeScript Strict، Python Typing، lint/format، tests، Architecture Decision Records (ADR)، وابستگی Core قابل جایگزینی، عدم ایجاد کامپوننت‌های God Object.

---

## 6. تجربه کاربری و مسیرهای اصلی

**UI direction:** Modern 16-bit / retro-inspired dark theme با Background `#10131D`، Surface `#20263A`، Violet `#9885F8`، Mint `#4EDCB0`، Amber `#F6C66B`. فونت متنی خوانا؛ Pixel Font صرفاً برای headings و decorative labels. انیمیشن کوتاه و کم‌تحرک. Mobile-first؛ Desktop Sidebar یا Top Nav، Mobile Bottom Nav.

**صفحات:** `/`, `/games`, `/games/[slug]`, `/consoles/[slug]`, `/library`, `/downloads`, `/play/[gameId]`, `/settings`, `/offline`, `/diagnostics`؛ جزئیات مسیرهای نهایی می‌توانند معادل معنایی داشته باشند، به شرط مستندسازی.

### UX-01 — اولین بازی
1. بازدیدکننده وارد Home می‌شود؛ بدون ثبت‌نام.
2. بازی را انتخاب می‌کند. Metadata و حجم دانلود واقعی را می‌بیند.
3. Capability Check و Core Compatibility انجام می‌شود و نتیجه توضیح داده می‌شود.
4. دانلود را آغاز می‌کند؛ پیشرفت Bytes واقعی را می‌بیند.
5. Verify انجام و Core + Offline Assets آماده می‌شوند.
6. دکمه Play جای Download را می‌گیرد؛ امکان Fullscreen و تنظیم کنترل.
7. بعد از Exit، بازی در My Library و Save مستقل باقی می‌ماند.

### UX-02 — Resume بعد از Browser Restart
1. دانلود 30% جلو می‌رود؛ Chunk معتبر persist می‌شود.
2. Browser/Tab کامل بسته می‌شود؛ شبکه دیگر دانلود نمی‌کند.
3. بازگشایی و آماده شدن App؛ وضعیت دانلود بازسازی و با Manifest Version مقایسه می‌شود.
4. Resume تنها Chunkهای missing را دریافت می‌کند؛ Bytes دریافت‌شده اولیه دوباره دانلود نمی‌شوند، مگر به علت نسخه یا Integrity mismatch.
5. SHA-256 نهایی، Installed و Offline Ready.

### UX-03 — آفلاین
1. کاربر یک Game Ready Offline دارد.
2. Network قطع؛ App Reload/بازگشایی می‌شود.
3. Library Local به‌درستی نشان داده می‌شود؛ Player، Core و ROM بدون Server اجرا می‌شوند.
4. Load/Save کار می‌کند؛ صفحات وابسته به API پیام Offline دارند.

### UX-04 — موبایل
1. Landscape Player، کنترل مجازی، فضا برای Notch و Safe Area.
2. Layout Edit → drag/resize/opacity → Save → reload persistence.
3. اگر Gamepad وصل شد می‌توان mapping/control mode را تغییر داد؛ Touch نباید بدون تنظیم از دسترس خارج شود.

### UX-05 — عدم سازگاری
1. Core requirements بررسی می‌شود.
2. نتیجه `unsupported` همراه دلیل عملی (مثلاً `crossOriginIsolated=false` یا Storage unavailable) نمایش داده می‌شود.
3. User در `limited/unknown` می‌تواند risk-aware try کند؛ `unsupported` به جای Crash راهنمای مرورگر جایگزین می‌دهد.

---

## 7. مدل داده Backend و Storage Client

### 7.1 Django Models

- `PlatformCategory(id, code, name)` — console/handheld/arcade/computer/browser.
- `Console(id, slug, name, manufacturer, generation?, category, status)`؛ slug یکتا.
- `EmulatorCore(id, code, version, status, runtime_type, min_capabilities:json, licensed_asset_manifest, supported_extensions)`؛ immutable version identity.
- `Game(id, slug, title, description, genre, cover_key, screenshots, published, created_at, updated_at)`.
- `GameRelease(id, game, console, region, revision, recommended_core, status, compatibility_note, release_order)`؛ یک Game می‌تواند چند Release داشته باشد.
- `GameAsset(id, release, kind[rom|disk|html_bundle|bios|artwork|patch], object_key, content_type, byte_size, sha256, version, etag?, compression?, license_status, provenance_url)`.
- `LaunchProfile(id, release, core, bios_requirements, audio_settings, display_settings, performance_hints, input_layout_default, verified_status)`.
- `CompatibilityReport(id, release, core, core_version, browser_family?, os_family?, device_class?, status, evidence_link, fps_notes?, tested_at)`؛ گزارش‌ها بدون داده شناسایی شخصی.
- `LicenseEvidence(id, asset, source_type, license_text_or_reference, approved_for_distribution, reviewer_or_automation_evidence, approved_at)`؛ برای نشر نیازمند تأیید معتبر.

قیود DB: unique `(console, slug)` در جای مناسب، unique `(asset, version)`، FK، Validation عدم Publish بدون Asset/License/Checksum معتبر، on_delete محافظه‌کارانه برای وابستگی‌ها، migration idempotent/rollback-tested.

### 7.2 Client IndexedDB schema (versioned)

- `downloads`: `downloadId`, `gameReleaseId`, `assetId`, `assetVersion`, `expectedSha256`, `totalBytes`, `chunkSize`, `state`, `bytesVerified`, `createdAt`, `updatedAt`, `leaseEpoch`.
- `downloadChunks`: `(downloadId, chunkIndex)`, `start`, `endExclusive`, `validatedLength`, `checksum?`, `committed`, `updatedAt`.
- `installations`: `releaseId`, `coreCode`, `coreVersion`, `romLocalPath`, `offlineAssetsVersion`, `verifiedAt`, `status`.
- `settings`, `inputProfiles`, `saveMetadata`, `libraryMetadata`, `recentGames`, `compatibilityProfiles`, `migrationJournal`.

**Data layout در OPFS:** `/games/<releaseId>/<assetVersion>/content.bin`, `/downloads/<downloadId>/...`, `/saves/<releaseId>/<coreId>/<coreVersion>/...`, `/core-cache/<coreId>/<version>/...` در صورت نیاز. نام مسیر از شناسه و whitelist ساخته شود، نه از نام فایل کاربر.

**سازگاری فایل و رکورد:** IndexedDB و OPFS Transaction مشترک ندارند؛ Chunk ابتدا نوشته، flush/close، سپس DB commit شود. پس از Crash با Reconciliation و صحت‌سنجی واقعی Chunkهای مشکوک، رکوردها تصحیح شوند. Atomic rename/commit فقط در صورتی ادعا شود که API و مرورگر آن را پشتیبانی کنند. مسیر Cleanup/Recovery الزامی.

---

## 8. API Contract — Django REST Framework

**پیشوند:** `/api/v1`، JSON، UTC ISO-8601، pagination، schema OpenAPI، status codes استاندارد، `X-Request-ID`، پیام خطا ساخت‌یافته و code قابل ماشین‌خواندن.

| Method | Endpoint | Purpose | Auth Demo |
|---|---|---|---|
| GET | `/health/live` | process alive | public |
| GET | `/health/ready` | DB/Storage readiness | public limited info |
| GET | `/api/v1/consoles/` | supported/candidate consoles | public |
| GET | `/api/v1/games/` | catalog + filters + search + pagination | public |
| GET | `/api/v1/games/{slug}/` | game details/releases | public |
| GET | `/api/v1/releases/{id}/` | release detail | public |
| GET | `/api/v1/releases/{id}/launch-config/` | pinned emulator profile, BIOS metadata | public |
| GET | `/api/v1/releases/{id}/download-manifest/` | versioned asset URLs + byte size + hash | public |
| GET | `/api/v1/emulators/` | core capabilities/version/status | public |
| GET | `/api/v1/compatibility/` | editorial verified compatibility | public |
| POST | `/api/v1/admin/...` | optional admin API; Django Admin کافی است | staff only |

**نمونه پاسخ Manifest (نمایشی، نه URL واقعی):**

``json
{
  "manifestVersion": 1,
  "releaseId": "release-uuid",
  "core": {"code":"pcsx_rearmed","version":"pinned-version"},
  "assets": [{
    "id":"asset-uuid",
    "role":"rom",
    "url":"https://storage.example.test/approved/sample.bin",
    "byteSize":104857600,
    "sha256":"64-char-hex-sha256",
    "version":"v1",
    "etag":null,
    "rangeSupported":true
  }],
  "offlineRequirements": ["app-shell", "emulator-core", "rom"],
  "requiredCapabilities": ["wasm"]
}
``

در خروجی واقعی `sha256` باید 64 رقم Hex واقعی باشد؛ مقادیر بالا فقط Contract هستند. URL ممکن است پس از بازگشایی Browser منقضی شده باشد؛ Client در Resume باید **Manifest تازه** بگیرد و نسخه/Checksum را با نسخه قبلی تطبیق دهد. در Demo می‌توان Asset عمومی S3 با CORS صحیح داشت؛ Secret Access Key هرگز وارد Browser نشود. در فاز Auth مدل را برای Signed URL آماده نگه دار.

**Error shape:**

``json
{"error":{"code":"ASSET_NOT_PUBLISHED","message":"This game is unavailable.","requestId":"...","details":{}}}
``

**Error cases:** `404` item missing، `409` incompatible asset version، `422` invalid request، `503` storage config/unavailable. هیچ URL داخلی یا اطلاعات AWS Secret در error leak نشود.

**CORS:** مجوز GET/HEAD و Range/If-Range/If-Match مطابق Preflight واقعی؛ `Content-Range`, `Content-Length`, `ETag`, `Accept-Ranges` در صورت موجود بودن و نیاز JS expose شوند. Hosting assets و headers برای `COEP: require-corp` با credentialless/CORP/CORS سازگار باشد.

---

## 9. State Machines و حالات خطا

### 9.1 Download State

`queued → checking-space → downloading ↔ paused → verifying → installing → ready-offline`

Transitionهای خطا: `downloading/verify/install → recoverable-error | fatal-error`, `any nonfinal → cancelled`, `ready-offline → missing | update-available | uninstalling`.

- وضعیت `ready-offline` **صرفاً** پس از تمام‌شدن Verify و Asset/Core Offline قابل تخصیص است.
- بعد از Crash در `downloading` برنامه ابتدا Reconcile و سپس `paused/resumable` می‌شود.
- خطای Quota قبل/میانه دانلود باید پیام واضح بدهد و سایر بازی‌ها/Saveها را سالم نگه دارد.
- `Cancel`: دانلود نیمه‌تمام را حذف می‌کند؛ `Pause`: داده حفظ می‌شود؛ `Delete Game`: فایل بازی را حذف می‌کند و Saveها را پیش‌فرض حفظ می‌کند.

### 9.2 Emulator State

`uninitialized → initializing → ready → loading → running ↔ paused → stopping → stopped/disposed`, خطاهای `unsupported-capability`, `missing-bios`, `invalid-rom`, `core-load-error`, `memory-limit`, `webgl-failure`, `audio-init`.

- Runtime errors نباید UI را به صفحه سفید تبدیل کنند.
- Player route leave / Component unmount باید Worker/Events/Audio/Texture را آزاد کند.
- هر runtime adapter مستقل از Catalog API باشد.

### 9.3 Controller State

`layout-default | layout-custom`, `keyboard-active`, `gamepad-connected`, `touch-active`, `input-suspended`. در `blur` و قطع Gamepad همه pressed states آزاد شوند.

---

## 10. معماری کد و ساختار Repository

Monorepo پیشنهادی؛ اگر Repository موجود convention معقولی دارد، بدون تخریب از آن تبعیت کن.

``text
retro-browser-gaming/
├── apps/
│   ├── web/                        # Next.js App Router, TS strict
│   │   ├── src/app/                # routes, layouts, loading, error, offline
│   │   ├── src/features/
│   │   │   ├── catalog/
│   │   │   ├── compatibility/
│   │   │   ├── downloads/
│   │   │   ├── offline-library/
│   │   │   ├── player/
│   │   │   ├── inputs/
│   │   │   ├── saves/
│   │   │   └── settings/
│   │   ├── src/lib/api/
│   │   ├── src/lib/storage/
│   │   ├── src/workers/
│   │   ├── src/emulators/{contracts,registry,emulatorjs,psp}/
│   │   ├── public/{icons,offline,cores}/
│   │   └── tests/{unit,integration,e2e}/
│   └── api/                        # Django + DRF
│       ├── config/
│       ├── modules/{catalog,emulators,assets,compatibility}/
│       ├── tests/
│       └── manage.py
├── packages/
│   └── contracts/                  # OpenAPI generated client/types
├── infra/
│   ├── docker/
│   ├── object-storage/
│   └── reverse-proxy/
├── scripts/                        # seed, fixture, smoke, asset validation
├── docs/
├── .github/workflows/             # CI
├── compose.yaml
├── .env.example
├── README.md
└── LICENSES/
``

### 10.1 Browser modules و SOLID

- `EmulatorRegistry` نگاشت Console/Release → Adapter و Core Capability؛ تصمیم Core به‌صورت config-driven نه `switch` 300 شاخه‌ای.
- `DownloadRepository` abstraction برای IndexedDB و OPFS؛ `DownloadScheduler` و `ChunkFetcher` مستقل؛ Worker ownership.
- `OfflineAssetCoordinator` cache/version readiness جدا از Download Manager.
- `StorageInspector` و `DeviceProfiler` pure/testable تا حد ممکن؛ Device detection وابسته به Browser پشت interface.
- `InputRouter` نگاشت Keyboard/Gamepad/Pointer به virtual commands؛ بدون وابستگی به کامپوننت React.
- `SaveRepository` checksum/versioned و `EmulatorSaveBridge` per core.
- `GameService` Backend از Serializer/API جدا؛ File URLs توسط storage adapter تأمین.
- HTML5 Game Engine: بازی‌های Bundle در Sandbox Origin جدا یا iframe محدود با policy مشخص؛ WASM/JS غیرقابل اعتماد هم public exposure نداشته باشد.

### 10.2 Core Interface پیشنهادی

``ts
export interface EmulatorAdapter {
  readonly id: string;
  readonly version: string;
  readonly capabilities: EmulatorCapabilities;
  probe(context: DeviceContext): Promise<ProbeResult>;
  initialize(options: InitOptions): Promise<void>;
  load(source: LocalGameSource, bios?: BiosSource): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reset(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  input(command: InputCommand): void;
}
export interface SaveStateCapable {
  exportState(slot?: number): Promise<Uint8Array>;
  importState(data: Uint8Array, slot?: number): Promise<void>;
}
``

واقعیت API EmulatorJS/PPSSPP را از مستندات نسخه انتخاب‌شده بررسی کن؛ اگر عملیات مستقیماً expose نشده باشد، Adapter باید با Interface قابل تست رفتار `unsupported` بدهد، نه Optional Chain صوری که هیچ کاری نمی‌کند. از Undocumented Core API فقط بعد از Spike و تثبیت نسخه + Test استفاده کن.

### 10.3 Asset loading strategy — ریسک بزرگ

قبل از توسعه گسترده، یکی از این مسیرها را **با اثبات اجرا** انتخاب کن:

1. **Small ROM:** استخراج Blob/File از OPFS و Object URL، در صورت تأیید Core و حجم قابل مدیریت.
2. **Large Disc:** adapter-specific streaming/seek-aware filesystem، Emscripten FS bridge یا local virtual file mechanism با random access؛ بدون ساخت یک ArrayBuffer هم‌اندازه کل ISO.
3. **Fallback:** اگر مسیر بزرگ اثبات نشد، ROMهای بزرگ در آن Browser/Core به‌درستی `unsupported` اعلام و ماتریس واقعیت ثبت شود؛ دانلود موفق بدون Playable بودن نباید «پشتیبانی کامل» محسوب شود.

در Spike Benchmark کن: memory peak، boot latency، consistency، seek در دیسک، Read/Write semantics. صرفاً Passing Unit Test با Fake Core کافی نیست.

---

## 11. امنیت، مجوزها و سیستم انتشار

### 11.1 حقوق نشر

- خودِ مالکیت ROM یا داشتن «لایسنس بازی» لزوماً به معنای حق توزیع دیجیتال، تغییر فرمت، استفاده از BIOS یا بازتوزیع Emulator Core نیست. هر یک را مستقل ثبت کن.
- EmulatorJS با GPL-3.0 منتشر می‌شود؛ قبل از Release انتشار Core/Frontend و obligations را با Dependency License Audit بررسی کن. Third-party core licenses ممکن است متفاوت باشند.
- Artifactهای باینری از منابع نامعتبر دانلود نشوند؛ provenance و SHA256 Pin ثبت شود.
- اگر Asset License Evidence تأیید نشده، Public Download/Publish ممنوع است؛ این شرط حتی در Demo بدون Auth برقرار است.
- Fixtureهای آزمایشی با License روشن و قابل بازتوزیع؛ هیچ ROM/BIOS دارای Copyright را از وب به‌صورت خودکار استخراج نکن.

### 11.2 Application baseline

- Django `DEBUG=False` در production، host allowlist و HTTPS، non-hardcoded secret، DB migrations، Admin authentication و staff-only.
- API عمومی Read-only؛ Django Admin با CSRF، session، password management. Rate-limit sensible و Basic Logging.
- هر JSON/Import/Asset مسیر schema validation؛ game title و user-controlled HTML sanitize/escape.
- Same-Origin Core asset hosting یا cross-origin headers بررسی‌شده. COOP/COEP برای PPSSPP threaded لازم است و باید با S3 CORS/Static Assets واقعی سازگار شود.
- PWA Service Worker Scope و Cache poisoning حفاظت؛ هرگز arbitrary third-party JS/HTML bundle را با همان Origin/Privileges اصلی اجرا نکن.
- `S3_ACCESS_KEY`, `S3_SECRET_KEY`, Django SECRET_KEY و admin password نباید در Browser build یا Git باشند.

---

## 12. برنامه فازبندی اجرایی — Gate-driven

**قانون عمومی برای همه فازها:** ابتدا implementation plan کوتاه در `docs/progress/phase-XX.md`، سپس Code و Unit/Integration/E2E، سپس Evidence، Commit و Gate. عبور از فاز فقط با Gate واقعی. تست صرفاً Mock نمی‌تواند اثبات رفتار Browser Runtime باشد. تست غیرفعال باید دلیل، لینک Issue و گزارش داشته باشد.

### PH-00 — Discovery / Feasibility / Baseline

**وظایف:** بررسی repo، environment، دسترسی network، emulator licensing و نسخه‌ها؛ انتخاب stable deps؛ در صورت نیاز scaffold؛ ساخت ADR برای Core Strategy و Storage Strategy؛ تهیه `asset-provenance.md` و Browser Matrix؛ بررسی امکان اجرای HTTPS/COOP/COEP و S3 Range؛ کشف ممنوعیت‌های قانونی.

**Tests:** بررسی Build Skeleton، DB connectivity، HTTP GET/Range روی Object Store local، Test `crossOriginIsolated` زیر reverse proxy محلی HTTPS، فایل مجاز برای Sega/PS1/PSP در صورت وجود، sanity check Emulator license.

**Gate G00:** `docs/architecture.md`, `docs/decisions/` و Environment Report آماده، ریسک PSP/ROM بزرگ ثبت، راه اجرای محلی مشخص؛ هیچ وعده اثبات‌نشده‌ای Accepted نشده باشد.

### PH-01 — Backend Foundations / Models / Admin

**وظایف:** Django/DRF/Postgres، Models §7، Migrations، Admin، Seeder و Public API با Pagination/Search/Filtering، OpenAPI/Generated TS types، Assets validation، Storage Adapter و health checks.

**Automated Tests:** Django `pytest` یا Django Test Runner، model constraints، CRUD در Admin، Unauthorized writes rejected، Read-only public endpoints، asset unpublished hidden، migration fresh DB + upgrade/rollback (در حد ممکن)، query count/Pagination sanity، schema snapshot.

**Gate G01:** Backend container healthy، migration clean، seed idempotent، `/api/v1/games` و `/api/v1/.../download-manifest` واقعی، 0 failing backend tests.

### PH-02 — Frontend Shell / UI / Catalog

**وظایف:** Next.js App Router + strict TS؛ طراحی responsive، راهبری desktop/mobile، Theme/Icons؛ صفحات Catalog/Game/Library/Downloads/Player placeholder با رفتار loading/error واقعی؛ API integration؛ no-auth public flows. هیچ دکمه بدون Handler.

**Automated Tests:** ESLint، Typecheck، Component Tests برای card/filter/errors، Playwright desktop viewport + mobile viewport navigation، keyboard nav، contrast/a11y audit، screenshots، صفحه Offline fallback.

**Gate G02:** API واقعی متصل، Home/Search/Details بدون Mock Data اجباری، Mobile responsive و 0 console uncaught error، build production موفق.

### PH-03 — Emulator Spike Sega + PS1 (Must pass before Download architecture hardening)

**وظایف:** بسته Core با نسخه pin، EmulatorJS Adapter prototype، real licensed/homebrew ROM boot، per-core BIOS requirements، input keyboard، lifecycle/cleanup، capture startup error، internal asset URL. تست مستقل Core local-asset URL و File/Blob. تمرکز بر اثباتِ «واقعاً می‌توان ROM ذخیره‌شده را Load کرد».

**Tests:** Browser Selenium/Playwright برای boot-screen plus manual/visual evidence؛ تأیید Fullscreen، audio, pause/resume/reset، input event to gameplay، runtime dispose/no duplicate worker؛ واحد Mock Core + **Integration با Core واقعی** و حداقل یک ROM قانونی.

**Gate G03:** اجرای Sega و PS1 با Evidence video/screenshot/log و ROM Provenance؛ اگر نبود ROM قانونی، Gate `BLOCKED_EXTERNAL_ASSET` و عدم علامت‌گذاری passed. نیاز به BIOS جدا ثبت شود.

### PH-04 — Resumable Download Engine

**وظایف:** Manifest، Chunk Scheduler، Range fetch، OPFS Worker persistence، IndexedDB journal، lease/locking بین تب‌ها، Retry/Cancel/Pause/Resume، Quota/Storage Error، SHA-256 واقعی، download queue، Network recovery، checksum mismatch و version invalidation.

**Automated Tests:** HTTP Mock Server (ترجیحاً واقعی) با پاسخ‌های `206/200/416/403/500`، `Content-Range` غلط، Network abort mid-chunk، checksum mismatch، asset changed، duplicate tabs، crash after file write/before DB commit، 100MiB interrupted download و reconstruction، binary comparison exact، stress 1GiB (امکان CI extended run).

**Gate G04:** 100MiB deterministic test با قطع و بازگشایی Browser Context و Byte-for-byte hash match؛ فایل مشکوک never installed؛ cancellation/delete/free-space صحیح؛ tests automated pass و evidence log.

### PH-05 — Offline PWA / Installation / Local Library

**وظایف:** manifest، SW، precache App Shell/Core، IndexedDB local catalog، OPFS readiness audit، no-network navigation، update policy، lost-install recovery، storage management، نصب اختیاری.

**Automated Tests:** بعد از install، Browser `offline=true`، reload `/library`, `/play/id`, `/settings`، verify no required network calls، three restarts، stale SW update simulation، missing ROM detection، Site Data cleared recovery، PWA audit.

**Gate G05:** حداقل Sega یا PS1 آفلاین با ROM واقعی اجرا شود؛ صرف نمایشی بودن Player قابل قبول نیست؛ Offline Shell and Core verified.

### PH-06 — PSP Spike + Integration (Critical)

**وظایف:** PPSSPP WASM pinned/versioned، WebAssembly threads و COOP/COEP/SharedArrayBuffer، Console Profile، ISO/CSO format آزمون، large file access strategy، memory/latency profiling، gamepad input و Save. جایگزین Adapter مستقل مجاز فقط در صورت شواهد بهتر.

**Tests:** assert `crossOriginIsolated`, wasm threads available، Browser real PSP core boots، actual licensed playable game reaches gameplay، no full ISO memory copy for production large ISO، pause/resume/save state where available، touch layout، offline boot.

**Gate G06:** با مرورگر/دستگاه پشتیبانی‌شده PSP playable واقعی + Offline evidence + Memory Profile؛ در غیر این صورت `FAILED/BLOCKED` مستند، و قابلیت PSP نباید supported عمومی اعلام شود. انتشار دمو به‌عنوان دارای PSP منوط به این Gate است.

### PH-07 — Unified Input / Touch Layout Editor

**وظایف:** Keyboard Keybindings و remap، Gamepad detection/disconnect، touch dpad+buttons+analog، Editor Drag/Resize/Opacity، layouts console-specific/orientation-specific، persistence و reset، safe-area.

**Tests:** `pointerdown/up/cancel`، multi-touch combination، gamepad simulated (و real device در صورت دسترسی)، keyboard remap، orientation change، reload persistent layout، input stuck prevention on blur/disconnect، emulator input e2e.

**Gate G07:** Mobile portrait/landscape layouts و desktop input کار کنند، نمایش control appropriately، accessibility focus و action state verified.

### PH-08 — Saves / Storage Management / Reliability

**وظایف:** Emulator Save Bridge و Local Save Repository، version+checksum، import/export، slots/persistence، autosave فقط هسته compatible، حذف ROM بدون حذف Save، quota dashboard و corrupted save recovery.

**Tests:** gameplay→save→exit→browser restart→load، offline saves، version mismatch explanation، corrupted save rejected with backup، delete-ROM-retain-save، export/import exact checksum، storage eviction UI.

**Gate G08:** حداقل یک Save/Load واقعی در Sega یا PS1 آفلاین؛ هیچ داده سالمی از دست نرود و no-op Save ممنوع.

### PH-09 — Additional Systems Registry + PS2 Experimental PoC

**وظایف:** لیست Candidate systems §3 در Registry با `available | unsupported | research` و metadata؛ افزودن adapter تنها برای coreهای واقعاً tested؛ PS2 Play! PoC در Feature Flag و مسیر isolated؛ گزارش CPU/GPU/Browser behavior؛ بدون dependency روی Core P0.

**Tests:** automated registry contract، unsupported console cannot be launched as supported، Play! اگر legal sample موجود بود boot test و performance report، main flow regression after optional core integration.

**Gate G09:** همه کنسول‌های Candidate catalog/registry دارای وضعیت صادقانه؛ PoC PS2 موفق یا دلیل شکست documented؛ هیچ شکست P0 ناشی از Experimental.

### PH-10 — Hardening / Security / Performance / Cross-browser

**وظایف:** اصلاح COOP/COEP/CORS، security checklist، Django production checks، Browser smoke matrix، network throttling، quota/eviction، core integrity، performance profiling، dependency/license scan، basic accessibility tests، error boundaries، upgrade migrations.

**Tests:** `docker compose --profile test up` (یا script documented)، Playwright Chromium + Firefox + WebKit smoke، Android/iOS real-device manual record (در صورت دسترسی)، lighthouse/PWA audit، stress download، concurrent tabs، network loss during gameplay, CSP and browser console scans، OWASP basic.

**Gate G10:** تمام gates اصلی P0 بدون regression؛ known failures classified؛ runbook end-to-end repeatable.

### PH-11 — Final Handover / Reproducibility

**وظایف:** README bootstrap، Deployment, Configuration, Asset Import, License Report, Architecture Diagrams، Troubleshooting، final environment example؛ تولید گزارش تست `PASS/FAIL/BLOCKED/NOT_VERIFIED` با شواهد؛ CI green؛ Final acceptance run از محیط تمیز.

**Tests:** clean clone→env example→compose up→migrate→seed→e2e، offline install/play، Resume recovery، PSP conditions، integrity validation، docs commands actual run، no uncommitted secrets.

**Gate G11 / DELIVERY:** نسخه دارای Commit/Tag مناسب، Buildها و Test Reports، Assets provenance، Screenshots، CI config، handover و شفافیت Blockerها تحویل شود. **Final Delivered / All Requirements Met فقط زمانی مجاز است که تمام معیارهای MUST واقعاً Passed باشند.**

---

## 13. ماتریس جامع Test Case (شناسه‌گذاری اجباری)

| ID | Test | Type | Acceptance |
|---|---|---|---|
| API-001 | public list/search/filter | Integration | HTTP 200 + expected items/pagination |
| API-002 | unpublished or unlicensed game | Security | asset not exposed/published |
| API-003 | manifest hash/size/version | Contract | all fields accurate and immutable version |
| API-004 | ready/readiness | Integration | no misleading ready if DB unavailable |
| CAT-001 | catalog→game→download | E2E | UI state consistent with API |
| CAT-002 | empty/offline/error pages | E2E | actionable non-blank UX |
| DL-001 | 206 range multi-chunk | Integration | correct bytes, offsets, total length |
| DL-002 | short/truncated range | Fault injection | invalid chunk rejected and retried |
| DL-003 | 200 response to range | Fault injection | safe fallback or explicit failure; no offset corruption |
| DL-004 | 416 response | Fault injection | refresh manifest/reconcile, no false complete |
| DL-005 | network interruption | Browser E2E | pause/retry with exact hash |
| DL-006 | reload/browser restart | Browser E2E | recover persisted chunks, download remainder |
| DL-007 | two tabs same download | Race test | single writer/lease; no corruption |
| DL-008 | crash before metadata commit | Recovery test | reconciliation, integrity preservation |
| DL-009 | asset version changed | Integration | old chunks not silently reused |
| DL-010 | SHA-256 wrong | Security test | install not ready, explicit error |
| DL-011 | quota exceeded | Fault injection | error + resume/cleanup, no data loss |
| DL-012 | cancel vs pause vs delete | Integration | precise states and cleanup |
| DL-013 | 1GiB synthetic file | Performance | bounded memory, hash match |
| OFF-001 | offline catalog reload | Browser E2E | no server dependency |
| OFF-002 | offline real game boot | Browser E2E | actual gameplay after network off |
| OFF-003 | offline save + reload | Browser E2E | save persisted |
| OFF-004 | core asset missing | Fault injection | not falsely ready; recoverable UX |
| OFF-005 | SW update during gameplay | Integration | active session not disrupted |
| EMU-001 | real Sega boot/gameplay | Browser/Manual evidence | frames/control/audio evidenced |
| EMU-002 | real PS1 boot/gameplay | Browser/Manual evidence | frames/control/audio evidenced |
| EMU-003 | PSP threaded wasm/boot | Browser E2E | isolated context + real gameplay |
| EMU-004 | PSP large ISO local access | Performance | no unbounded full-file memory |
| EMU-005 | lifecycle exit/re-enter | Stress | no duplicate workers/event leaks |
| EMU-006 | unsupported core | Negative test | clear unsupported state |
| CMP-001 | no SharedArrayBuffer | Unit/Browser | PSP marked unsupported accurately |
| CMP-002 | quota unknown | Unit | limited/unknown, not false compatible |
| IN-001 | keyboard mapping | E2E | input drives game |
| IN-002 | simulated/real gamepad | E2E/manual | button mapping works |
| IN-003 | touch multi-input | E2E mobile | dpad+action simultaneously |
| IN-004 | custom layout reload | E2E | position/size/opacity retained |
| IN-005 | blur/disconnect | Unit/E2E | pressed state released |
| SAV-001 | save/restart/load | Browser E2E | exact state restored |
| SAV-002 | delete game keep saves | Integration | saves preserved |
| SAV-003 | invalid save imported | Negative test | rejected without destroying previous |
| SEC-001 | no secrets shipped to client | Build audit | zero findings |
| SEC-002 | COOP/COEP/CORS | Browser/HTTP | threaded Core operational; assets accessible |
| SEC-003 | illegal asset publish | Backend Security | fails validation |
| SEC-004 | unsafe HTML bundle | Browser isolation | cannot access site privileged storage |
| UX-001 | mobile 360px + tablet + desktop | Visual E2E | no clipped critical controls |
| UX-002 | keyboard accessibility | Accessibility | controls focusable, labelled |
| DEP-001 | clean build/compose | Smoke | migrations and services healthy |
| DEP-002 | docs commands | Acceptance | copy-paste run succeeds |

هر سناریو باید در Test Code یا Manual Evidence با همان ID موجود باشد؛ فقط نوشتن جدول کافی نیست. Failure report باید Repro Steps، Input، Expected، Actual، Logs و Fix Commit را داشته باشد.

---

## 14. واقعی بودن تست‌ها و سیاست ضد «پاس صوری»

### 14.1 دسته‌های تست

1. **Unit:** توابع pure، state transition، mapping، validators، serializer.
2. **Integration:** API+DB+Object Storage، Fake HTTP Range Server با semantics واقعی، OPFS/IndexedDB در Browser.
3. **E2E:** Next app در Browser واقعی، Django/Storage واقعی local، HTTP/Service Worker واقعی.
4. **Visual/Runtime Evidence:** اسکرین‌شات یا ضبط کوتاه از Game Boot و Gameplay، نشانگر Controller Input، Console Error و Runtime Stats.
5. **Device Manual:** Android Chrome، Desktop Chrome/Firefox، Safari iOS در صورت دستگاه؛ با `NOT_VERIFIED` اگر دستگاه نیست.

### 14.2 ممنوعیت‌ها

- Passing با mock کردن `EmulatorAdapter.start()` در تست اثبات «بازی اجرا شد» ممنوع.
- Passing با progress bar ساختگی، fake HTTP response بدون قطع شبکه، یا offline cached HTML بدون Core/ROM ممنوع.
- استفاده از `test.skip` بی‌دلیل، خاموش کردن Exceptions یا ignore کردن Console Errors برای رسیدن به green build ممنوع.
- اسکرین‌شات از Placeholder Player معادل اثبات Emulator نیست.

### 14.3 حداقل شواهد هر Gate

`.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-xx/`: `test-run.txt`، `environment.md`، `screenshots/` یا `video/` (در صورت مرتبط)، `failures.md`، `status.json`. شناسه Git Commit و نسخه dependencies و Browser در Evidence ذکر شود. برای تست دستی، زمان اجرا، محیط و نتیجه `PASS/FAIL/NOT_VERIFIED` نوشته شود.

---

## 15. Browser Support Matrix

| Environment | Catalog | Range/Offline | Sega/PS1 | PSP threaded | Input |
|---|---|---|---|---|---|
| Chromium Desktop current stable | MUST | MUST | MUST | target tested | keyboard/gamepad |
| Firefox Desktop current stable | MUST | target verified | target verified | conditional | keyboard/gamepad |
| Chromium Android current stable | MUST | MUST for supported devices | target verified | conditional | touch/gamepad |
| Safari iOS current stable | MUST | best-effort/real-device verification | conditional | experimental | touch/gamepad |
| Desktop PWA installed mode | MUST | MUST | MUST | conditional | keyboard/gamepad |

**نکته:** `target verified` یعنی باید در مسیر تست واقعی نتیجه ثبت شود، نه اینکه در همه نسخه‌ها از پیش تضمین شده باشد. Firefox/Android/Safari ممکن است Quota و Worker/Memory متفاوت داشته باشند. هیچ پلتفرمی بدون تست به‌صورت عمومی با نشان سبز قطعی تبلیغ نشود.

---

## 16. CI/CD و دستورات مورد انتظار

**پیشنهاد دستورات در README** (نام دقیق می‌تواند براساس tooling انتخاب‌شده تغییر کند اما معادل لازم است):

``bash
cp .env.example .env
# Populate non-production local placeholders; no real secret committed.
docker compose up --build -d
docker compose exec api python manage.py migrate
docker compose exec api python manage.py seed_demo --safe-assets-only
# Health API and Frontend smoke
# Backend tests, Frontend lint/types/unit, Playwright integration/E2E
``

در `package.json` و tooling Backend اسکریپت‌های واضح لازم است: `lint`, `typecheck`, `test`, `test:e2e`, `test:offline`, `test:download`, `test:core`, `build`. Jobهای CI: backend-test, frontend-quality, browser-e2e, license/dependency audit, optional heavy perf nightly. S3 dev data و tests باید deterministic باشند. تست‌های Game Core نیازمند fixture قانونی‌اند و وضعیت آن‌ها در CI صریح باشد.

**Configuration ENV examples:**

``dotenv
DJANGO_SECRET_KEY=replace-for-local-dev
DJANGO_DEBUG=true
DATABASE_URL=postgresql://retro:retro@db:5432/retro
S3_ENDPOINT_URL=http://object-store:9000
S3_BUCKET=retro-demo
S3_ACCESS_KEY_ID=local-only-placeholder
S3_SECRET_ACCESS_KEY=local-only-placeholder
S3_REGION=us-east-1
PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
``

این مقادیر **نمونه هستند**. به علت تفاوت آدرس‌دهی Client Browser و Container، دو URL خصوصی داخل Docker و Public browser-facing در کد و Docs از هم جدا باشند. متغیرهای Browser با `NEXT_PUBLIC_` هرگز شامل Secret نشوند. Production profile باید HTTPS termination، asset CORS/CORP، و headers لازم را فراهم کند.

---

## 17. راهنمای انتخاب پکیج و Dependency Review

- EmulatorJS docs: `https://emulatorjs.org/docs4devs/cores/` و `https://emulatorjs.org/docs/options/`.
- Sega MD: `genesis_plus_gx`؛ **PicoDrive در سند رسمی Sega MD هشدار خرابی دارد**؛ برای Genesis پیش‌فرض نگذار تا نسخه مورد نظر تأیید شود.
- PS1: `pcsx_rearmed` یا core تست‌شده دیگر، BIOS regional requirements را بررسی کن.
- PSP: EmulatorJS Core `ppsspp` با `EJS_threads = true`، COOP/COEP و شرط crossOriginIsolated.
- PS2: Play! browser/WASM experimental، Feature Flag فقط research.
- Storage: MDN OPFS/StorageManager/IndexedDB؛ Worker API را per-browser Verify کن.
- S3: AWS `GetObject Range` و تنظیم CORS ExposeHeaders؛ Chunk retrieval semantics را دقیق پیاده کن.
- Next.js: PWA official guide، App Router و Service Worker؛ به Build System نسخه انتخاب‌شده توجه کن.
- Browser: MDN Background Fetch محدود است؛ full-browser-closed continuous download از Must Scope خارج است.

**ثبت واقعی نسخه:** فایل `docs/dependencies.md` باید core URL/revision/commit، hash asset، license، browser requirements و دلیل انتخاب را داشته باشد. اگر dependency docs نسخه جدیدتر شد، ابتدا Upgrade Test انجام بده.

---

## 18. Edge Cases و الزامات بازیابی

- فقدان اینترنت از شروع؛ API timeout؛ بازی دانلود شده اما Metadata offline از بین رفته؛ Core در Cache نیست؛ Quota صفر یا unknown؛ مرورگر private mode؛ SW خراب/قدیمی؛ S3 403 ناشی از expired URL؛ `ETag` عوض شده؛ Cache evicted؛ Download same game in two tabs؛ Browser crashed هنگام commit؛ Chunk missing؛ File hash mismatch؛ User removes stored data؛ Gamepad جدا شد؛ Rotate device هنگام gesture؛ Audio autoplay blocked؛ Page visibility change؛ console renderer WebGL context loss؛ PSP threads absent؛ ZIP/CUE/BIN multi-file set ناقص؛ تفاوت region BIOS؛ Save state incompatible core version؛ Shutdown هنگام save.

برای هر حالت، یک ErrorCode صریح، UI message، راه Recovery و تست (اگر قابل خودکارسازی است) ثبت شود. **خطای Recoverable نباید منجر به حذف بی‌اجازه داده شود**.

---

## 19. طراحی Asset Format برای بازی‌های مختلف

- **Cartridge-based (Sega):** یک فایل ROM ساده با پسوند و MIME validated؛ hash + version.
- **PS1 Optical Disc:** `bin/cue` چندفایلی، `chd` یا قالب‌های تاییدشده همان Core؛ Manifest Bundle با تمام فایل‌های لازم، Paths نسبی و Integrity هر فایل؛ نیاز احتمالی BIOS جداگانه.
- **PSP:** `ISO/CSO` فقط اگر Adapter و Core انتخابی واقعاً پشتیبانی کند؛ Range/seek و memory tested.
- **HTML5:** packaged bundle از Asset Store، HTML/JS/CSS/assets، offline manifest؛ اجرای isolated origin/iframe policy؛ به Web Origin اصلی دسترسی به IndexedDB/OPFS نداشته باشد.
- **BIOS:** Asset Role مستقل با license flag؛ عدم انتشار پیش‌فرض.

**GameAsset Bundle:** ID/version/checksum/byte size برای هر فایل؛ `requiredFiles[]`، `entryFile`، `emulatorCoreVersion`، `licenseEvidenceId`. Installer باید یا Bundle کامل و Verified بسازد یا هیچ‌گاه `ready-offline` ندهد.

---

## 20. معیار پذیرش نهایی / Definition of Done

تمام موارد زیر باید تحقق یابند:

- [ ] Backend Django/DRF واقعی با PostgreSQL و Django Admin و Asset/License Validation.
- [ ] Next.js responsive با صفحات اصلی و Retro Dark UI؛ بدون عملکرد تزئینی جعلی.
- [ ] S3-compatible با Manifest واقعی و دانلود مستقیم Range، checksum and crash-safe Resume.
- [ ] امکان بستن و بازگشایی Browser و تکمیل فایل معتبر با صرفه‌جویی در Chunkهای قبل.
- [ ] OPFS+IndexedDB و بازیابی Integrity؛ مدیریت Quota و Delete.
- [ ] PWA/Service Worker و Game Library واقعی آفلاین؛ اجرا پس از قطع Network.
- [ ] یک ROM مجاز Sega با Gameplay واقعی و Evidence.
- [ ] یک ROM مجاز PS1 با Gameplay واقعی و Evidence.
- [ ] یک ROM مجاز PSP در Browser واجد شرایط با Gameplay واقعی و Evidence، یا صریحاً ثبت عدم تحقق این Must و برچسب تحویل ناقص.
- [ ] HTML5 Game مستقل، isolated و offline.
- [ ] Device Compatibility منطقی، شروط Threads و Storage صحیح.
- [ ] Keyboard + Touch Custom Layout؛ Gamepad واقعی یا محیط تست verified؛ وضعیت Physical Test صادقانه.
- [ ] Save/Load واقعی حداقل یک Emulator، خروج/ورود مجدد و بازیابی.
- [ ] Core Registry و Candidate consoles مستقل؛ PS2 Experimental isolated.
- [ ] Unit/Integration/E2E و Fault tests، CI، Licensing Audit و Security Baseline.
- [ ] Clean clone + Docker Compose + Seed + End-to-end run documented.
- [ ] `docs/final-handover.md`: معماری، دستورات، Credentials صرفاً لوکال در ENV، نسبت Gateهای Passed، Blockerها، Known limitations و شواهد.

**هیچ Agent مجاز نیست «کامل و آماده تحویل» اعلام کند اگر حداقل یکی از Mustهای بالا واقعاً Passed نشده است.** اجرای مستقل به معنی حذف نظارت فنی نیست؛ یعنی تست و گزارش به‌جای درخواست‌های مکرر از کارفرما انجام می‌شود.

---

## 21. قالب گزارش اجباری هر فاز

``markdown
# Phase PH-XX — <title>
Date / commit / branch / environment:

## Implemented
- Changed files and WHY
- Before behavior
- After behavior
- Architectural decisions / alternatives considered

## Tests
| Test ID | Command/Method | Result PASS/FAIL/BLOCKED/NOT_VERIFIED | Evidence |
|---|---|---|---|

## Known issues / workarounds
- Exact blocker, severity, reproducibility
- Remaining risk

## Gate verdict
PASS / FAIL / BLOCKED_EXTERNAL

## Next phase plan
- ...
``

`docs/final-handover.md` باید خلاصه تمامی فازها، لینک‌های شواهد در Repository، دقیقاً چه چیزهایی کار می‌کنند/نمی‌کنند، Tested Browsers/Devices، Asset Provenance و گام‌های نصب Production را داشته باشد.

---

## 22. دستور پایانی قابل کپی برای Agent

> **Build this project autonomously from PDR RBG-PDR-001.** Read the full document before coding. Preserve existing repository work. Implement each phase PH-00 through PH-11, obey every gate, and run the specified real tests. Do not ask for routine design decisions; choose safe defaults and record them. Build the actual emulator, resumable downloader, PWA offline runtime, touch controller, backend, and deployment artifacts. Use only legally distributable ROMs/BIOS/assets; when unavailable, deliver the legal offline HTML5 demo and precise blocked evidence rather than pretending a console passed. Do not misrepresent closed-browser background downloads, hardware detection, mobile verification, PSP support, or PS2 compatibility. Keep test evidence and docs updated on every phase. Provide a final handover with executable commands, CI/test reports, browser support, successful game-play evidence, limitations and unresolved blockers. Only declare project COMPLETE when all mandatory acceptance tests pass.

---

## 23. پیوست — منابع فنی معتبر (بررسی‌شده در اکتبر ۲۰۲۶)

1. EmulatorJS Supported Cores: https://emulatorjs.org/docs4devs/cores/
2. EmulatorJS Options/Core hooks and threads: https://emulatorjs.org/docs/options/
3. EmulatorJS Sega Mega Drive (PicoDrive warning): https://emulatorjs.org/docs/systems/sega-mega-drive/
4. EmulatorJS PlayStation BIOS/core options: https://emulatorjs.org/docs/systems/playstation/
5. EmulatorJS PSP requires threads: https://emulatorjs.org/docs/systems/psp/
6. EmulatorJS virtual controller mapping: https://emulatorjs.org/docs4devs/virtual-gamepad-settings/
7. EmulatorJS source/license: https://github.com/EmulatorJS/EmulatorJS
8. Next.js official PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps
9. MDN FileSystemSyncAccessHandle (dedicated workers): https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle
10. MDN Storage quota/eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
11. MDN StorageManager.persist: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
12. MDN crossOriginIsolated: https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated
13. MDN Background Fetch limited support: https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API
14. MDN Gamepad API: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
15. AWS S3 GetObject Range support: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
16. AWS S3 CORS/ExposeHeaders: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html

**پایان سند — RBG-PDR-001 v1.0**
