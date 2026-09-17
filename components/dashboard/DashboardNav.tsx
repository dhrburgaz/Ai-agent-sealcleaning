'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/login/actions';
import { AyYildizEmblem } from '@/components/beyza/AyYildizEmblem';

const PRIMARY_ITEMS = [
  { href: '/dashboard', label: 'Komuta Merkezi' },
  { href: '/dashboard/beyza', label: "Beyza'yı Ara" },
  { href: '/dashboard/agents', label: 'Ajan Ağı' },
];

const NAV_ITEMS = [
  { href: '/dashboard/leads', label: 'Lead’ler' },
  { href: '/dashboard/quotes', label: 'Teklifler' },
  { href: '/dashboard/follow-ups', label: 'Takip Mesajları' },
  { href: '/dashboard/jobs', label: 'İşler' },
  { href: '/dashboard/calendar', label: 'Takvim' },
  { href: '/dashboard/pricebook', label: 'Fiyat Listesi' },
  { href: '/dashboard/suppliers', label: 'Tedarikçiler' },
  { href: '/dashboard/inventory', label: 'Envanter' },
  { href: '/dashboard/finance', label: 'Finans' },
  { href: '/dashboard/settings', label: 'Ayarlar' },
  { href: '/dashboard/settings/beyza', label: 'Beyza Ayarları' },
  { href: '/dashboard/settings/theme', label: 'Tema' },
  { href: '/dashboard/settings/ai-usage', label: 'AI Kullanımı' },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm transition ${
        active
          ? 'bg-accent-soft text-ink shadow-glow-sm'
          : 'text-ink/80 hover:bg-accent-soft/50 hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );
}

export function DashboardNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  return (
    <aside className="glass-panel hidden w-64 shrink-0 flex-col p-4 sm:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
        <AyYildizEmblem className="h-7 w-7 text-accent" />
        <div>
          <div className="text-lg font-semibold tracking-[0.15em] text-ink">BEYZA</div>
          <div className="text-[10px] tracking-[0.3em] text-muted">SECURITY</div>
        </div>
      </Link>

      <nav className="space-y-1">
        {PRIMARY_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>
      <div className="hud-divider my-3" />
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>

      <div className="hud-divider mb-4 mt-2" />
      <div className="text-xs text-muted">
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
