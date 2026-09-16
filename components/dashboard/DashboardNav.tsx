import Link from 'next/link';
import { logoutAction } from '@/app/login/actions';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Komuta Merkezi' },
  { href: '/dashboard/leads', label: 'Lead’ler' },
  { href: '/dashboard/quotes', label: 'Teklifler' },
  { href: '/dashboard/jobs', label: 'İşler' },
  { href: '/dashboard/pricebook', label: 'Fiyat Listesi' },
  { href: '/dashboard/suppliers', label: 'Tedarikçiler' },
  { href: '/dashboard/settings', label: 'Ayarlar' },
  { href: '/dashboard/settings/theme', label: 'Tema' },
];

export function DashboardNav({ displayName }: { displayName: string }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface-raised/60 p-4">
      <div className="mb-6 px-2">
        <div className="text-lg font-semibold tracking-wide text-ink">BEYZA</div>
        <div className="text-xs text-muted">SECURITY</div>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm text-ink/90 transition hover:bg-accent-soft hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4 border-t border-border pt-4 text-xs text-muted">
        <div className="mb-2 truncate">{displayName}</div>
        <form action={logoutAction}>
          <button type="submit" className="text-accent hover:underline">
            Çıkış yap
          </button>
        </form>
      </div>
    </aside>
  );
}
