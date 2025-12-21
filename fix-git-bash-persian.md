# راهنمای نمایش صحیح فارسی در Git Bash

## مشکل
Git Bash به‌طور پیش‌فرض فونت‌های فارسی را به درستی نمایش نمی‌دهد و به جای حروف فارسی، کاراکترهای مربعی یا علامت سوال نشان می‌دهد.

## راه‌حل ۱: تغییر فونت Git Bash (توصیه می‌شود)

### مراحل:

1. **Git Bash را باز کنید**

2. **روی نوار بالای پنجره راست کلیک کنید** → `Options`

3. **در تب `Text`:**
   - Font: `Courier New` یا `Consolas` را انتخاب کنید
   - Character set: `UTF-8` را انتخاب کنید
   - Font size: `10` یا `12` (به دلخواه)

4. **در تب `Keys`:**
   - Ctrl+Shift+letter shortcuts: `Off`

5. **Save** کنید

### فونت‌های پیشنهادی برای فارسی:
- ✅ **Courier New** (بهترین گزینه)
- ✅ **Consolas**
- ✅ **Lucida Console**
- ❌ Raster Fonts (فارسی رو نمایش نمی‌دهد)

---

## راه‌حل ۲: استفاده از Windows Terminal (بهترین تجربه)

Windows Terminal نمایش بسیار بهتری برای فارسی دارد.

### نصب:

```powershell
# از Microsoft Store نصب کنید:
# جستجو: "Windows Terminal"

# یا با winget:
winget install Microsoft.WindowsTerminal
```

### تنظیمات Windows Terminal برای Git Bash:

1. Windows Terminal را باز کنید
2. Settings (`Ctrl + ,`) → Add new profile
3. Command line: `C:\Program Files\Git\bin\bash.exe`
4. Name: `Git Bash`
5. Font face: `Cascadia Code` یا `Courier New`
6. Save

---

## راه‌حل ۳: فایل تنظیمات `.minttyrc`

فایل زیر را در `C:\Users\<USERNAME>\.minttyrc` ذخیره کنید:

```ini
Font=Courier New
FontHeight=10
Charset=UTF-8
Locale=fa_IR
BoldAsFont=no
Columns=120
Rows=30
CursorType=block
```

---

## راه‌حل ۴: استفاده از VSCode Terminal

اگر VSCode استفاده می‌کنید:

1. File → Preferences → Settings
2. جستجو: `terminal font`
3. Terminal › Integrated: Font Family → `Courier New, Consolas`
4. Terminal را باز کنید: `Ctrl + `` (backtick)
5. Git Bash را به عنوان shell انتخاب کنید

---

## تست نمایش فارسی

بعد از تنظیم، این دستورات را امتحان کنید:

```bash
# نمایش فارسی در echo
echo "سلام دنیا - یلدا مبارک 🎉"

# نمایش لاگ‌های git به فارسی
git log --oneline -3

# نمایش محتوای فایل فارسی
cat README.md
```

اگر حروف فارسی به درستی نمایش داده شد، مشکل حل شده است! ✅

---

## نکات مهم

### برای Git Commit با پیام فارسی:

```bash
# از UTF-8 اطمینان حاصل کنید
git config --global core.quotepath false
git config --global i18n.commitEncoding utf-8
git config --global i18n.logOutputEncoding utf-8

# مثال commit با پیام فارسی
git commit -m "اصلاح نمایش فونت‌های فارسی"
```

### اگر هنوز مشکل دارید:

1. **Restart Git Bash** بعد از تغییر تنظیمات
2. بررسی کنید locale روی UTF-8 است:
   ```bash
   locale
   # باید UTF-8 را نشان دهد
   ```
3. بررسی کنید Git از UTF-8 استفاده می‌کند:
   ```bash
   git config --global --get i18n.commitEncoding
   # باید utf-8 برگرداند
   ```

---

## توصیه نهایی

**بهترین تجربه:** Windows Terminal + Git Bash profile

این ترکیب بهترین نمایش فارسی، emoji و رنگ‌ها را فراهم می‌کند و برای کار روزانه توصیه می‌شود.

---

**موفق باشید! 🚀**
