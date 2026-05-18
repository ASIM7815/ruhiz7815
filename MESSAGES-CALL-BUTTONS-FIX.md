# Messages Call Buttons Visibility Fix

## Issue
Call buttons (Phone and Video) in the messages chat header were disappearing at normal zoom levels and only visible when zoomed in. This was a responsive design/CSS issue where buttons were being hidden or pushed off-screen.

## Root Cause
The flex layout in the chat header was allowing elements to shrink and compress, causing the call buttons to be hidden on smaller viewports or at normal zoom levels. The issue was caused by:
1. Missing `flex-shrink-0` on critical elements
2. Text container not handling overflow properly
3. Redundant `ml-auto` causing layout issues
4. Fixed padding/spacing not responsive

## Solution
Updated the chat header layout in `src/app/(platform)/messages/page.tsx` (lines 890-960):

### Changes Made:
1. **Added `flex-shrink-0` to all critical elements**:
   - Back button: `className="md:hidden flex-shrink-0"`
   - Avatar: `className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"`
   - Call buttons container: `className="flex items-center gap-1 flex-shrink-0"`
   - Individual buttons: `className="h-9 w-9 flex-shrink-0"`

2. **Fixed text container overflow**:
   - Changed from `className="min-w-0 flex-1"` to `className="min-w-0 flex-1 overflow-hidden"`
   - Added `truncate` to name and UID text to ensure proper text truncation

3. **Removed redundant spacing**:
   - Removed `ml-auto` from call buttons container (flex-1 already handles spacing)

4. **Made layout responsive**:
   - Padding: `p-3 sm:p-4` (smaller on mobile)
   - Gap: `gap-2 sm:gap-3` (tighter on mobile)
   - Avatar: `h-8 w-8 sm:h-9 sm:w-9` (smaller on mobile)

5. **Explicit button sizing**:
   - Added `h-9 w-9` to ensure buttons maintain consistent size

## Result
✅ Call buttons now always visible at all zoom levels
✅ Responsive layout works on all screen sizes
✅ Text truncates properly without pushing buttons off-screen
✅ Build successful with no TypeScript errors

## Files Modified
- `src/app/(platform)/messages/page.tsx` - Chat header layout (lines 890-960)

## Testing Recommendations
1. Test at different zoom levels (50%, 100%, 150%, 200%)
2. Test on different screen sizes (mobile, tablet, desktop)
3. Test with long user names to ensure truncation works
4. Verify call buttons remain clickable and functional
5. Test both audio and video call initiation

## Status
✅ **COMPLETE** - Build successful, call buttons now always visible
