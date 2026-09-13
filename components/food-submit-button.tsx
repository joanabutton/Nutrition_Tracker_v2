"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FoodSubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  pendingLabel: string;
};

/**
 * Gives food mutations a browser-generated idempotency key and prevents a
 * second tap while the associated server action is running.
 */
export function FoodSubmitButton({
  children,
  disabled = false,
  pendingLabel,
  ...buttonProps
}: FoodSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [submissionId] = useState(() => crypto.randomUUID());

  return (
    <>
      <input name="submissionId" type="hidden" value={submissionId} />
      <button {...buttonProps} disabled={disabled || pending}>
        {pending ? pendingLabel : children}
      </button>
    </>
  );
}
