import { css } from "@flow-css/core/css";
import { useLayoutEffect, useRef } from "react";

export function Modal(props: {
  children: React.ReactNode;
  closedby?: "none" | "any";
  open: boolean;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    if (props.open) {
      modalRef.current?.showModal();
    } else {
      modalRef.current?.close();
    }
  }, [props.open]);

  return (
    <dialog
      ref={(ref) => {
        modalRef.current = ref;
        ref?.addEventListener("close", (e) => {
          e.preventDefault();
          props.onClose();
        });
      }}
      closedby={props.closedby ?? "any"}
      className={css(({ v }) => ({
        padding: 0,
        border: "none",
        borderRadius: "8px",
        boxShadow: v("--shadow"),
        backgroundColor: v("--c-bg"),
        color: v("--c-text"),
        minWidth: "400px",
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        margin: 0,
        "&::backdrop": {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        },
      }))}
    >
      {props.children}
    </dialog>
  );
}
