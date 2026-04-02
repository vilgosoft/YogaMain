import { HiOutlineArrowsPointingIn, HiOutlineArrowsPointingOut } from 'react-icons/hi2';
import styles from './FullscreenButton.module.scss';

interface FullscreenButtonProps {
  inFullscreenUi: boolean;
  onToggle: () => void;
}

export function FullscreenButton({ inFullscreenUi, onToggle }: FullscreenButtonProps) {
  return (
    <button
      type="button"
      className={styles.fullscreenBtn}
      onClick={() => void onToggle()}
      aria-label={inFullscreenUi ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={inFullscreenUi ? 'Exit fullscreen' : 'Fullscreen'}
    >
      {inFullscreenUi ? (
        <HiOutlineArrowsPointingIn size={22} aria-hidden />
      ) : (
        <HiOutlineArrowsPointingOut size={22} aria-hidden />
      )}
    </button>
  );
}
