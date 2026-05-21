# PriceHawk S4 — Design System v2 "Phantom Intelligence"

File này dùng để AI model hiểu **phong cách thiết kế giao diện (UI/UX)** khi bắt đầu session mới.
**Cập nhật lần cuối:** 07/05/2026 — Migration v1 → v2 Phantom Intelligence.

---

## Triết lý thiết kế

- **Phong cách chính:** Phantom Intelligence — precision, technical, premium. Giao diện tối giản, dùng violet glow và shadow thay vì glassmorphism.
- **Ngôn ngữ màu:**
  - 🟣 **Violet** = màu thương hiệu (CTA, tab active, focus ring, hover border)
  - 🟡 **Amber** = màu giá tiền (CHỈ dùng cho giá — không dùng cho bất kỳ thứ gì khác)
  - ⬜ **Zinc** = nền trung tính (thay thế hoàn toàn slate và gray)
- **Dark mode:** First-class. Mọi component đều có cặp `light/dark` rõ ràng.
- **Typography:** Inter (sans-serif). Headings dùng `tracking-tight`.
- **Hình khối:** Card chính `rounded-2xl` (16px), input `rounded-xl`, pill buttons `rounded-full`.
- **Animation:** `duration-200` cho mọi transition. Hover card dùng violet glow shadow, KHÔNG dùng translate-y lift.
- **Responsive:** Mobile-first, grid `grid-cols-1 → 2 → 3 → 4`.

---

## Color System

### Brand Palette (Violet)
| Token | Light mode | Dark mode | Dùng cho |
|-------|-----------|-----------|----------|
| Primary bg | `bg-violet-600` | `bg-violet-500` | Primary button, active tab solid fill |
| Primary hover | `hover:bg-violet-700` | `dark:hover:bg-violet-400` | Primary button hover |
| Focus ring | `ring-violet-500/50` | `ring-violet-500/50` | Focus-visible trên mọi interactive element |
| Card hover border | `hover:border-violet-300` | `dark:hover:border-violet-800` | SearchCard hover border |
| Card hover shadow | `hover:shadow-violet-500/10` | `hover:shadow-violet-500/10` | SearchCard hover glow |
| Brand badge | `bg-violet-100 text-violet-700` | `dark:bg-violet-900 dark:text-violet-300` | Brand badge trên SearchCard |

### Price Palette (Amber)
| Token | Light mode | Dark mode | Dùng cho |
|-------|-----------|-----------|----------|
| Price text | `text-amber-600` | `dark:text-amber-400` | Số tiền, giá sản phẩm |
| Price badge | `bg-amber-50 text-amber-700 border-amber-200` | `dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800` | Badge "Rẻ nhất" / "Best" |

### Neutral Palette (Zinc Scale)
| Mức độ | Light | Dark | Dùng cho |
|--------|-------|------|----------|
| Background page | `bg-zinc-50` | `bg-zinc-950` | Body background |
| Background card | `bg-white` | `dark:bg-zinc-900` | Card surfaces |
| Background input | `bg-zinc-50` | `dark:bg-zinc-900` | Search inputs |
| Background skeleton | `bg-zinc-100` | `dark:bg-zinc-800` | Loading placeholders |
| Border subtle | `border-zinc-200` | `dark:border-zinc-800` | Card borders |
| Border input | `border-zinc-300` | `dark:border-zinc-700` | Input fields |
| Text primary | `text-zinc-900` | `dark:text-zinc-50` | Headings, primary text |
| Text secondary | `text-zinc-500` | `dark:text-zinc-400` | Muted text, descriptions |
| Text tertiary | `text-zinc-600` | `dark:text-zinc-400` | Tab inactive |

### Semantic Colors
| State | Light | Dark | Dùng cho |
|-------|-------|------|----------|
| Error | `bg-rose-50` / `text-rose-700` | `bg-rose-900/30` / `text-rose-400` | Error messages, validation |
| Success | `bg-emerald-50` / `text-emerald-700` | `bg-emerald-900/30` / `text-emerald-400` | Triggered alerts, success states |

### ⚠️ Quy tắc màu bắt buộc
- **KHÔNG** tự ý thêm màu mới ngoài palette trên
- **KHÔNG** dùng amber cho bất cứ thứ gì ngoài giá tiền
- Gradient DUY NHẤT được phép: không có gradient brand badge nữa (dùng solid violet)
- Mọi màu background phải có cặp dark tương ứng
- Opacity chỉ dùng với `/80`, `/85`, `/70`, `/30`, `/40`, `/50`, `/10`, `/20` — không dùng opacity tùy tiện

---

## Typography

### Font Family
- **Primary:** `Inter` (Google Fonts, loaded qua `next/font/google`)
- **Fallback:** system-ui, sans-serif
- **Antialiasing:** `antialiased` được bật toàn cục trên `<body>`

### Type Scale
| Size | Class | Dùng cho |
|------|-------|----------|
| Hero | `text-4xl` / `text-5xl` | Landing page hero |
| H1 Page | `text-2xl md:text-3xl` | Page title (ProductBrowser header) |
| H2 Section | `text-xl` | Section headings, empty state |
| Card Title | `text-lg font-bold` | Product name trong SearchCard |
| Body | `text-base` | Paragraph, input text |
| Small / Caption | `text-sm` | Metadata, brand, footer links, button text |
| Extra Small | `text-xs` | Dropdown subtitle, badge |
| Micro | `text-[10px]` | Brand badge uppercase (SearchCard) |

### Font Weight
- `font-black`: Logo text
- `font-bold`: Headings, card titles, active states
- `font-semibold`: Buttons, labels, nav links, metadata, prices
- `font-medium`: Body emphasis, pagination buttons

### Tracking & Leading
- Headings: `tracking-tight` (bắt buộc)
- Body: mặc định Tailwind
- Card title: `leading-snug` + `line-clamp-2`
- Giá: `tabular-nums`

---

## Layout & Spacing

### Container
- **Max width:** `max-w-7xl` (1280px)
- **Padding responsive:** `px-4 sm:px-6 lg:px-8`
- **Centering:** `mx-auto`

### Grid System
| Breakpoint | Columns | Component áp dụng |
|------------|---------|-------------------|
| Default (<640px) | 1 col | Product grid |
| `sm` (640px) | 2 cols | Product grid |
| `lg` (1024px) | 3 cols | Product grid |
| `xl` (1280px) | 4 cols | Product grid |

### Common Spacing Tokens
| Token | Giá trị | Dùng cho |
|-------|---------|----------|
| Card gap | `gap-6` | Grid giữa các SearchCard |
| Section padding | `py-8` | Header sections |
| Card internal | `p-3`, `px-4`, `pt-6`, `pb-3` | SearchCard padding |
| Input padding | `py-2.5`, `py-3`, `px-4` | Form controls |
| Button padding | `px-4 py-2.5` | Standard buttons |

### Z-Index Hierarchy
| Layer | Z-Index | Element |
|-------|---------|---------|
| Modal / Overlay | `z-50` | Navbar sticky |
| Dropdown | `z-20` | Search autocomplete dropdown |
| Sticky header | `z-20` | ProductBrowser sub-header |
| Content | default | Page content |

---

## Component Library

### 1. SearchCard
Vị trí: `@/components/SearchCard.jsx`
- **Shape:** `rounded-2xl`, overflow-hidden
- **Border:** `border-zinc-100 dark:border-zinc-800/80`, hover → `border-violet-300 dark:border-violet-800`
- **Shadow:** `shadow-sm` default, hover → `shadow-lg hover:shadow-violet-500/10`
- **Hover transform:** KHÔNG dùng translate-y — chỉ dùng shadow glow
- **Image container:** `aspect-square`, `bg-zinc-50 dark:bg-zinc-100`, `rounded-xl`, `object-contain p-5`
- **Image hover:** `group-hover:scale-[1.06]` trong 200ms
- **Brand badge:** Absolute top-right, solid `bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300`, `rounded-full`, `uppercase tracking-widest text-[10px]`
- **Arrow button:** `w-10 h-10 rounded-full`, `bg-zinc-50 dark:bg-zinc-800`, hover → `bg-violet-600 dark:bg-violet-500` + `shadow-violet-500/20`

### 2. AppSearchBar
Vị trí: `@/components/ui/AppSearchBar.jsx`
- **Input:** `rounded-xl`, `bg-zinc-50 dark:bg-zinc-900`, `border-zinc-300 dark:border-zinc-700`
- **Focus:** `focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:focus:bg-zinc-900`
- **Dropdown:** `absolute top-full z-20`, `rounded-xl`, `bg-white dark:bg-zinc-900`, `shadow-lg`
- **Dropdown item hover:** `hover:bg-violet-50 dark:hover:bg-zinc-800`
- **Icon:** Search SVG absolute left, `text-zinc-400`
- **Price in dropdown:** `text-amber-600 dark:text-amber-400` với `formatPrice()`

### 3. PageTabs
Vị trí: `@/components/ui/PageTabs.jsx`
- **Style:** Pill buttons `rounded-full`, `text-sm font-semibold`
- **Active:** Solid fill `bg-violet-600 text-white border border-violet-600 px-4 py-1.5`
- **Inactive:** `bg-transparent text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-4 py-1.5`
- **Layout:** `flex flex-wrap gap-2`

### 4. ThemeToggle
Vị trí: `@/components/ThemeToggle.jsx`
- **Shape:** Custom sliding toggle `w-14 h-8 rounded-full`
- **Track:** `bg-zinc-200` (light) / `bg-violet-600` (dark active)
- **Knob:** `w-6 h-6 rounded-full`, translate-x animation 200ms
- **Icons:** Sun (`text-amber-500`) / Moon (`text-zinc-100` khi dark)
- **Behavior:** Toggle light ↔ dark, respects system preference

### 5. ProductSearch
Vị trí: `@/components/ui/ProductSearch.jsx`
- Tương tự AppSearchBar nhưng không submit on enter
- Dùng trong form context (alerts, wishlist)

### 6. PriceComparisonRow (MỚI v2)
Vị trí: `@/components/ui/PriceComparisonRow.jsx`
- Hiển thị 1 dòng so sánh giá: retailer + favicon + price + "Best" badge
- **Price:** `tabular-nums text-amber-600 dark:text-amber-400`
- **Best badge:** `text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800`

### 7. SkeletonLoader
Vị trí: Inline trong `ProductBrowser.jsx`
- **Container:** `grid` với cùng breakpoint như product grid
- **Card:** `bg-zinc-100 dark:bg-zinc-800`, `rounded-2xl`, `h-80`, `animate-pulse`
- **Count:** 8 skeleton items

### 8. Buttons
| Variant | Class tokens | Dùng cho |
|---------|-----------|----------|
| Primary | `ui.primaryButton` (violet bg, white text, rounded-lg) | CTA chính |
| Secondary | `ui.secondaryButton` (white bg, zinc border, rounded-lg) | Hủy, đóng modal |
| Ghost | `ui.ghostButton` (zinc text, hover bg) | Action phụ |
| Pagination | `rounded-full bg-zinc-100 dark:bg-zinc-800` | Prev/Next |
| Pagination Active | `rounded-full bg-violet-600 text-white` | Current page indicator |
| Icon Circle | `w-10 h-10 rounded-full` | Arrow trong SearchCard |

---

## Dark Mode

### Strategy
- **Engine:** `next-themes` với `attribute="class"`
- **Default:** `system` (tự động theo OS)
- **Class:** `dark` được thêm vào `<html>` khi cần

### Color Mapping Rules (v2)
```
Light background → Dark background
bg-white        → dark:bg-zinc-900
bg-zinc-50      → dark:bg-zinc-950 (page bg)
bg-zinc-100     → dark:bg-zinc-800
border-zinc-200 → dark:border-zinc-700 hoặc dark:border-zinc-800
text-zinc-900   → dark:text-zinc-50
text-zinc-500   → dark:text-zinc-400
text-zinc-600   → dark:text-zinc-400
```

### Special Dark Behaviors
- **Shadow:** `shadow-sm` giữ nguyên; hover shadow giữ nguyên trong dark mode (không tắt)
- **Backdrop blur:** Giữ nguyên trong cả 2 mode (navbar)
- **Page bg:** Light mode có thể dùng gradient; dark mode dùng `bg-zinc-950`

---

## Animation & Motion

### Timing Tokens
| Duration | Dùng cho |
|----------|----------|
| `duration-200` | Mọi hover, focus, color transition, card shadow, image scale |
| `duration-200 ease-out` | ThemeToggle knob slide |

### Common Patterns
- **Card glow hover:** `hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-200`
- **Image zoom:** `group-hover:scale-[1.06] transition-transform duration-200`
- **Border color shift:** `hover:border-violet-300 dark:hover:border-violet-800 transition-all`
- **Button scale:** `hover:scale-[1.02] active:scale-[0.98]` (primary buttons)
- **Text color shift:** `group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors`

### Keyframe Animations (globals.css)
- **card-appear:** `opacity: 0 → 1`, `translateY(8px) → 0` trong 200ms
- **price-shimmer:** Background position shimmer (dùng cho skeleton nếu cần)
- Class: `.animate-card-appear`

### Performance
- Dùng `transform` và `opacity` cho animation — không animate `width`, `height`, `top`, `left`

---

## Responsive Breakpoints

| Breakpoint | Width | Thay đổi chính |
|------------|-------|----------------|
| Default | < 640px | 1-col grid, navbar tabs ẩn → hiện dưới search, compact search |
| `sm` | ≥ 640px | 2-col grid |
| `md` | ≥ 768px | Navbar tabs hiện, search max-w-xs, PageTabs inline |
| `lg` | ≥ 1024px | 3-col grid, px-8 |
| `xl` | ≥ 1280px | 4-col grid |

### Navbar Responsive
- **Desktop:** Logo → PageTabs → External link + ThemeToggle → Search (compact)
- **Mobile:** Logo → Search + ThemeToggle → PageTabs xuống hàng riêng (`md:hidden pb-3`)

---

## Design Tokens & Code Patterns

### Single Source of Truth
`@/components/ui/designSystem.js` — file DUY NHẤT chứa UI tokens.

```js
export const ui = {
  pageWrap: "min-h-screen bg-zinc-50 dark:bg-zinc-950",
  container: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
  card: "rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all duration-200",
  cardHover: "hover:border-violet-300 dark:hover:border-violet-800 hover:shadow-lg hover:shadow-violet-500/10",
  heading: "text-zinc-900 dark:text-zinc-50 tracking-tight",
  mutedText: "text-zinc-500 dark:text-zinc-400",
  price: "tabular-nums text-amber-600 dark:text-amber-400",
  ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950",
  primaryButton: "...",
  secondaryButton: "...",
  ghostButton: "...",
  input: "...",
};

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
```

### Pattern viết component mới
```jsx
import { cn, ui } from "@/components/ui/designSystem";

export default function MyComponent() {
  return (
    <div className={cn(ui.pageWrap)}>
      <div className={cn(ui.container, "py-8")}>
        <h1 className={cn(ui.heading, "text-2xl font-bold")}>Tiêu đề</h1>
        <p className={cn(ui.mutedText, "mt-2")}>Mô tả phụ</p>
        <button className={cn(ui.primaryButton)}>Hành động</button>
      </div>
    </div>
  );
}
```

### Pattern dùng `group` + `group-hover`
```jsx
<Link className="group ...">
  <Image className="group-hover:scale-[1.06] ..." />
  <h2 className="group-hover:text-violet-600 dark:group-hover:text-violet-400 ...">
</Link>
```

### Pattern input với focus ring
```jsx
<input className={cn(
  "w-full rounded-xl border border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
  "text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
  "focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20",
  ui.ring
)} />
```

### Pattern hiển thị giá (BẮT BUỘC)
```jsx
import { formatPrice } from "@/app/utils/format";
import { cn, ui } from "@/components/ui/designSystem";

<span className={cn(ui.price, "text-xl font-medium")}>
  {formatPrice(lowestPrice)}
</span>
```

---

## Asset & Iconography

### Icons
- **Library:** `lucide-react` (Sun, Moon, v.v.)
- **Custom SVG:** Search icon inline trong AppSearchBar, Arrow right trong SearchCard
- **Logo:** Inline SVG native, có 2 variant: dark mode eye (`text-violet-400`) và light mode eye (`text-violet-600`)

### Images
- **Product images:** Dùng `next/image` với `fill` + `object-contain`, `sizes` responsive
- **Mix blend:** `mix-blend-multiply` trên product images để loại bỏ nền trắng

### Favicons
- Google Favicons API: `https://www.google.com/s2/favicons?domain=...` cho retailer logos

---

## ⛔ Anti-patterns UI — KHÔNG làm những điều này

- ❌ **KHÔNG** hardcode class Tailwind dài dòng trong JSX → luôn dùng tokens từ `designSystem.js`
- ❌ **KHÔNG** quên `dark:` prefix khi thêm màu mới → mọi color class phải có cặp dark
- ❌ **KHÔNG** dùng `text-gray-*` → dùng `text-zinc-*`
- ❌ **KHÔNG** dùng `bg-gray-*` → dùng `bg-zinc-*`
- ❌ **KHÔNG** dùng `rounded-[32px]` hay `rounded-3xl` cho card chính → card chính phải là `rounded-2xl`
- ❌ **KHÔNG** dùng `rounded-full` cho input → input phải là `rounded-xl`
- ❌ **KHÔNG** dùng `hover:-translate-y-*` trên card → thay bằng `hover:shadow-lg hover:shadow-violet-500/10`
- ❌ **KHÔNG** dùng `duration-300` → mọi transition phải là `duration-200`
- ❌ **KHÔNG** dùng `cyan-*`, `teal-*`, `sky-*`, `slate-*` → đã bị cấm trong v2
- ❌ **KHÔNG** dùng amber cho bất cứ thứ gì ngoài giá tiền
- ❌ **KHÔNG** tạo màu mới ngoài palette đã định (violet + amber + zinc + rose cho error)
- ❌ **KHÔNG** inline style (`style={{...}}`) → dùng Tailwind class
- ❌ **KHÔNG** quên `"use client"` nếu component dùng hooks hoặc browser APIs
- ❌ **KHÔNG** format giá tiền thủ công → luôn dùng `formatPrice()` từ `@/app/utils/format.js`
- ❌ **KHÔNG** bỏ `line-clamp-2` trên tên sản phẩm → đảm bảo card height đồng nhất
- ❌ **KHÔNG** dùng `z-index` tùy tiện → tuân theo bảng Z-Index đã định nghĩa

---

## ✅ Checklist trước khi merge UI changes

- [ ] Font: Inter cho toàn bộ UI — không còn DM Sans / DM Mono
- [ ] Giá tiền: `text-amber-600 dark:text-amber-400` + `tabular-nums` + `formatPrice()`
- [ ] Primary accent: violet — không còn cyan/teal
- [ ] Neutral: zinc-* — không còn slate-*, gray-*
- [ ] Card radius: `rounded-2xl` — không còn `rounded-[32px]` hay `rounded-3xl`
- [ ] Input radius: `rounded-xl` — không còn `rounded-full` trên input
- [ ] Hover card: violet glow shadow — không còn `hover:-translate-y-*`
- [ ] Dark mode: mọi color class có cặp `dark:` tương ứng
- [ ] Focus ring: `ring-violet-500/50`
- [ ] Animation: `duration-200` — không còn `duration-300`
- [ ] `PriceComparisonRow` component đã tạo mới
- [ ] `globals.css` có 2 keyframe mới (`price-shimmer`, `card-appear`)
- [ ] `DESIGN.md` đã cập nhật sang v2
- [ ] Không còn class cấm: `cyan`, `teal`, `sky`, `slate`, `gray`
- [ ] Mobile responsive không vỡ (< 640px)

---

## Session Log — Cập nhật UI

### Session 07/05/2026 — Migration v1 → v2 Phantom Intelligence
**Mục tiêu:** Migrate toàn bộ UI từ Design System v1 (cyan/teal/slate/Inter) sang v2 "Phantom Intelligence" (violet/amber/zinc/Inter).
**Đã làm:**
- Cập nhật `app/layout.js`: giữ Inter làm font chính
- Cập nhật `tailwind.config.js`: giữ nguyên config gốc
- Rewrite `components/ui/designSystem.js`: tokens v2 (zinc, violet, amber)
- Migrate `SearchCard.jsx`, `AppSearchBar.jsx`, `PageTabs.jsx`, `ThemeToggle.jsx`, `Navbar.jsx`, `ProductBrowser.jsx`
- Tạo mới `components/ui/PriceComparisonRow.jsx`
- Cập nhật `app/globals.css`: xóa `scale-up-center`, thêm `card-appear` và `price-shimmer`
- Quét và làm sạch codebase: xóa toàn bộ `cyan-`, `teal-`, `sky-`, `slate-`, `gray-`, `duration-300`, `rounded-[32px]`, `hover:-translate-y-*`
- Cập nhật `DESIGN.md` sang v2
**Kết quả:** Toàn bộ UI đã nhất quán với palette v2. Không còn class cấm.
**Mục tiêu session tiếp theo:** Theo dõi phản hồi UI, tinh chỉnh nếu cần.

---

> **Rule vàng:** File design stale còn hại hơn không có file — AI sẽ tạo component không khớp phong cách và break consistency.
>
> **Sau mỗi session làm việc UI, cập nhật:**
> 1. Dòng "Cập nhật lần cuối" ở header
> 2. Thêm component mới vào Phần 6
> 3. Thêm/điều chỉnh color token nếu có
> 4. Cập nhật Phần 11 (Session Log)
> 5. Kiểm tra lại Checklist Phần 12
