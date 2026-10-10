import { Pin, PinOff } from 'lucide-react';
import { usePrefs } from '../../state/selectors';
import { useActions } from '../app/useActions';
import { IconButton } from './Toolbar';

/** Keep the window above other apps (FR-025). */
export function PinButton() {
  const { pinned } = usePrefs();
  const actions = useActions();
  return (
    <IconButton
      label={pinned ? 'Unpin from top' : 'Pin on top'}
      pressed={pinned}
      onClick={() => {
        void actions.setPinned(!pinned);
      }}
    >
      {pinned ? <PinOff size={18} aria-hidden /> : <Pin size={18} aria-hidden />}
    </IconButton>
  );
}
