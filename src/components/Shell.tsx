import Link from "next/link";
import { Feather, ArrowUpRight } from "lucide-react";
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <Feather size={20} />
      </span>
      ProofWrite<span className="free-tag">FREE</span>
    </Link>
  );
}
export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="site-header">
      <Brand />
      <nav>
        {children || (
          <Link href="/teacher">
            교사 공간 <ArrowUpRight size={15} />
          </Link>
        )}
      </nav>
    </header>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={error ? "notice error" : "notice"}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export const time = (at: number) =>
  new Date(at).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
