import { useEffect, useRef } from 'react';

/** Native dialog supplies focus containment; restore the actual opener when it closes. */
export function useModalDialog(isOpen: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen]);
  return ref;
}
