import { useEffect, useEffectEvent } from 'react';
import { useApp } from '../../state/selectors';
import { isTextEntry } from '../app/shortcuts';
import { useActions } from '../app/useActions';
import { readImage } from './imageFile';
import { useVisibleRect } from './useVisibleRect';

/** Adds a section (or a note) in the nearest free spot of the visible board (FR-006). */
export function useAddSection(note = false) {
  const actions = useActions();
  const visible = useVisibleRect();
  return () => {
    actions.addSection(visible(), { note });
  };
}

/** Adds an image card from a picked or pasted file; anything else shows a notice. */
export function useAddImage() {
  const actions = useActions();
  const visible = useVisibleRect();
  const setNotice = useApp((s) => s.setNotice);
  return async (file: Blob) => {
    const image = await readImage(file);
    if (image) actions.addSection(visible(), { image });
    else setNotice("That image can't be added. Use a PNG, JPEG, GIF or WebP picture.");
  };
}

/** Ctrl+V with a picture on the clipboard adds it, unless the paste is going into a text field. */
export function useImagePaste() {
  const addImage = useAddImage();
  const onPaste = useEffectEvent((e: ClipboardEvent) => {
    if (isTextEntry(e.target)) return;
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    void addImage(file);
  });
  useEffect(() => {
    const listener = (e: ClipboardEvent) => {
      onPaste(e);
    };
    window.addEventListener('paste', listener);
    return () => {
      window.removeEventListener('paste', listener);
    };
  }, []);
}
