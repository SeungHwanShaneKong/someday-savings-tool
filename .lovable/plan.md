
# Landing Page Top Spacing Fix

## Problem
The landing page's main content area lacks sufficient top padding, causing the church emoji (💒) to be clipped at the top of the visible area, especially on smaller screens.

## Solution
Add top padding to the `<main>` element on the landing page to ensure the animated emoji and all content have breathing room from the top edge.

## Technical Details

**File**: `src/pages/Landing.tsx` (line 117)

Current:
```html
<main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
```

Updated:
```html
<main className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-20">
```

Adding `pt-16` (4rem / 64px) of top padding ensures the bouncing emoji has enough space and won't be clipped by the top edge or any header/navigation bar.
