import { getDateSeparator } from "../utils/date-formatting";

interface DateSeparatorProps {
  date: string | Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const text = getDateSeparator(date);
  
  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-3 py-1 rounded-full bg-muted/80 text-xs font-medium text-muted-foreground">
        {text}
      </div>
    </div>
  );
}
