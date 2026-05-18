interface Message {
  id: string;
  senderId: string;
  createdAt: string;
  [key: string]: any;
}

/**
 * Check if two messages should be grouped together
 * Messages are grouped if:
 * - Same sender
 * - Within 2 minutes of each other
 */
export function shouldGroupMessages(msg1: Message, msg2: Message): boolean {
  if (msg1.senderId !== msg2.senderId) return false;
  
  const time1 = new Date(msg1.createdAt).getTime();
  const time2 = new Date(msg2.createdAt).getTime();
  const diffMinutes = Math.abs(time2 - time1) / 60000;
  
  return diffMinutes <= 2;
}

/**
 * Group messages by date and sender
 */
export interface GroupedMessage extends Message {
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showDate: boolean;
  dateSeparator?: string;
}

export function groupMessagesByDate(messages: Message[]): GroupedMessage[] {
  if (messages.length === 0) return [];
  
  const grouped: GroupedMessage[] = [];
  let currentDate: string | null = null;
  
  messages.forEach((msg, index) => {
    const msgDate = new Date(msg.createdAt).toDateString();
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
    
    // Check if we need a date separator
    const showDate = msgDate !== currentDate;
    if (showDate) {
      currentDate = msgDate;
    }
    
    // Check if this is first/last in a group
    const isFirstInGroup = !prevMsg || !shouldGroupMessages(prevMsg, msg);
    const isLastInGroup = !nextMsg || !shouldGroupMessages(msg, nextMsg);
    
    grouped.push({
      ...msg,
      isFirstInGroup,
      isLastInGroup,
      showDate,
      dateSeparator: showDate ? msgDate : undefined,
    });
  });
  
  return grouped;
}
