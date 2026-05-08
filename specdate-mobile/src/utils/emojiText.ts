export type TextSelection = {
  start: number;
  end: number;
};

export function insertEmojiAtSelection(
  value: string,
  emoji: string,
  selection?: TextSelection | null
): { value: string; selection: TextSelection } {
  const start = Math.max(0, Math.min(selection?.start ?? value.length, value.length));
  const end = Math.max(start, Math.min(selection?.end ?? start, value.length));
  const nextValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
  const nextCursor = start + emoji.length;

  return {
    value: nextValue,
    selection: { start: nextCursor, end: nextCursor },
  };
}
