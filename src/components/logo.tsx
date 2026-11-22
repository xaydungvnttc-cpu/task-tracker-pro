/**
 * Logo TTC Điều Hành: mũ bảo hộ cam trên nền xanh thép, có dấu tích (việc đã kiểm soát).
 * Vẽ bằng SVG nên sắc nét ở mọi cỡ; dùng chung cho thanh bên, trang đăng nhập và biểu tượng app.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0f2a44" />
      <path d="M14 40c0-10 8-18 18-18s18 8 18 18z" fill="#f97316" />
      <rect x="10" y="40" width="44" height="6" rx="3" fill="#f97316" />
      <rect x="29" y="18" width="6" height="10" rx="2" fill="#fb923c" />
      <path d="M24 34l6 5 11-12" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="leading-tight">
        <span className={light ? "block text-[15px] font-extrabold tracking-tight text-white" : "block text-[15px] font-extrabold tracking-tight text-ink"}>TTC Điều Hành</span>
        <span className={light ? "block text-[10px] font-medium uppercase tracking-[0.14em] text-safety-400" : "block text-[10px] font-medium uppercase tracking-[0.14em] text-safety-600"}>Theo dõi công trường</span>
      </span>
    </span>
  );
}
