import { insertEmojiAtSelection } from '../emojiText';

describe('insertEmojiAtSelection', () => {
  it('inserts an emoji at the cursor', () => {
    expect(insertEmojiAtSelection('hello there', '😊', { start: 5, end: 5 })).toEqual({
      value: 'hello😊 there',
      selection: { start: 7, end: 7 },
    });
  });

  it('replaces selected text with an emoji', () => {
    expect(insertEmojiAtSelection('hello there', '❤️', { start: 6, end: 11 })).toEqual({
      value: 'hello ❤️',
      selection: { start: 8, end: 8 },
    });
  });
});
