import type { ReactNode } from "react";

export default function AuthLayout({ title, lead, children, footer }: { title: ReactNode; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-heading-sm">{title}</h1>
      {lead && <p className="mt-2 text-body-lg text-warm">{lead}</p>}
      <div className="mt-8 rounded-card border border-line bg-card p-6 shadow-card">{children}</div>
      {footer && <div className="mt-4 text-center text-body text-warm">{footer}</div>}
    </div>
  );
}
