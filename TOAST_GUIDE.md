# Toast Notification Guide

Enhanced toast notifications have been added to the Settings page with:

## Success Toasts (Green)
```tsx
toast({
  title: "✨ Success!",
  description: "Your action completed successfully.",
  className: "bg-green-500/10 border-green-500/50 text-green-500",
});
```

## Error Toasts (Red)
```tsx
toast({
  title: "❌ Error",
  description: "Something went wrong.",
  variant: "destructive",
  className: "bg-red-500/10 border-red-500/50",
});
```

## Warning Toasts (Yellow)
```tsx
toast({
  title: "⚠️ Warning",
  description: "Please check your input.",
  variant: "destructive",
  className: "bg-yellow-500/10 border-yellow-500/50",
});
```

## Applied to Settings Page:
- ✨ Profile photo uploaded successfully
- ✨ Cover image uploaded successfully  
- ✨ Profile updated successfully
- ❌ Upload failed
- ⚠️ Invalid file type
- ⚠️ File too large
- ⚠️ Maximum badges reached

Use these patterns across the entire app for consistent UX.
