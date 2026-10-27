"use client";

import { useEffect, type RefObject } from "react";

export function useDialogScrollLock(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ).filter(
        (element) =>
          element.getClientRects().length > 0 && !element.closest("[inert]"),
      );
    const frame = requestAnimationFrame(() =>
      focusable()[0]?.focus({ preventScroll: true }),
    );
    function containFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    function containScroll(event: Event) {
      if (event.target instanceof Node && !dialog?.contains(event.target))
        event.preventDefault();
    }
    document.addEventListener("keydown", containFocus);
    document.addEventListener("wheel", containScroll, { passive: false });
    document.addEventListener("touchmove", containScroll, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", containFocus);
      document.removeEventListener("wheel", containScroll);
      document.removeEventListener("touchmove", containScroll);
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [open, dialogRef]);
}
