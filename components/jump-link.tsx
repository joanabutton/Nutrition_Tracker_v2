"use client";

type JumpLinkProps = {
  children: React.ReactNode;
  className: string;
  href: string;
  targetId: string;
};

export function JumpLink({ children, className, href, targetId }: JumpLinkProps) {
  return (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        const target = document.getElementById(targetId);

        if (!target) {
          return;
        }

        event.preventDefault();
        window.history.pushState(null, "", href);
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {children}
    </a>
  );
}
