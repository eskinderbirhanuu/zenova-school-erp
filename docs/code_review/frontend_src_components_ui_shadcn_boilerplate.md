# Batch Report — Standard shadcn/ui Boilerplate Components

The following files are standard shadcn/ui component wrappers. They are well-formed, follow the official shadcn/ui patterns, use `forwardRef`, `cn()` utility, and Radix primitives where applicable. No code quality issues found beyond the standard boilerplate nature of these files.

## Files Reviewed

| File | Lines | Library |
|---|---|---|
| `avatar.tsx` | 37 | @radix-ui/react-avatar |
| `badge.tsx` | 30 | class-variance-authority |
| `button.tsx` | 50 | @radix-ui/react-slot, cva |
| `card.tsx` | 56 | cva (custom `shadow` variant) |
| `checkbox.tsx` | 11 | Native input (no Radix) |
| `dialog.tsx` | 122 | @radix-ui/react-dialog |
| `dropdown-menu.tsx` | 41 | @radix-ui/react-dropdown-menu |
| `form.tsx` | 75 | react-hook-form (custom wrapper) |
| `input.tsx` | 21 | Native input |
| `label.tsx` | 18 | @radix-ui/react-label, cva |
| `select.tsx` | 72 | @radix-ui/react-select |
| `separator.tsx` | 23 | @radix-ui/react-separator |
| `skeleton.tsx` | 13 | Pure CSS |
| `tabs.tsx` | 55 | @radix-ui/react-tabs |
| `textarea.tsx` | 20 | Native textarea |
| `toast.tsx` | 91 | @radix-ui/react-toast, cva |

## Notable Details

- **card.tsx** (line 15): Adds a custom `shadow="glass"` variant with backdrop blur — goes beyond default shadcn.
- **form.tsx** (lines 19-75): Custom react-hook-form wrapper rather than @hookform/resolvers. Uses `useFormContext` for nested form fields. Error display uses inline string concatenation for classes (line 64) rather than `cn()` — minor style inconsistency.
- **checkbox.tsx** (line 6): Uses native `<input>` with `accent-primary` instead of @radix-ui/react-checkbox — simpler but loses Radix accessibility features.
- **toast.tsx** (line 31): Adds custom `success` variant beyond default shadcn.
- **button.tsx** (line 7): Adds `active:scale-[0.97]` press animation and `hover:-translate-y-0.5` lift effect — extended from base shadcn.
- **dialog.tsx** (line 24): Uses `data-[state]` animation classes from tailwindcss-animate.
- **select.tsx** (line 23): Uses `SelectPrimitive.Icon asChild` pattern for the chevron.

## Issues

### Issue 1 — `form.tsx` Inline String Concatenation

- **Lines:** 64-66
- **Severity:** Low
- **Category:** Consistency
- **Description:** Uses template literal `className={`w-full rounded-md border px-3 py-2 text-sm ${error ? "border-red-500" : "border-gray-300"} ${disabled ? "bg-gray-100" : ""}`}` instead of the `cn()` utility used by all other components.

### Issue 2 — `checkbox.tsx` No Radix Primitive

- **Lines:** 4-8
- **Severity:** Info
- **Category:** Consistency
- **Description:** Uses native `<input type="checkbox">` while other interactive components (@radix-ui/react-checkbox is available). Loses Radix's built-in focus management and accessibility handling.

### Issue 3 — `form.tsx` `error.message` Cast

- **Lines:** 71
- **Severity:** Low
- **Category:** Type Safety
- **Description:** `error.message as string` — type assertion that could mask undefined. Use optional chaining and a fallback.

## Final Score (all files)

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Consistency | 7/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
