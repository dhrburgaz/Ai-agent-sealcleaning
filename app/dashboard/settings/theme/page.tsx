import { getOrCreateThemeConfig } from '@/lib/server/repo';
import { updateThemeAction } from './actions';

const THEMES = [
  { value: 'ay-yildiz-dark-red', label: 'Ay-Yıldız Dark Red', description: 'Varsayılan iç tema.' },
  { value: 'classic-premium-dark', label: 'Classic Premium Dark', description: 'Nötr koyu tema.' },
  { value: 'neutral-business-light', label: 'Neutral Business Light', description: 'Açık, kurumsal tema.' },
];

export default async function ThemeSettingsPage() {
  const theme = await getOrCreateThemeConfig();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Tema Ayarları</h1>
      <form action={updateThemeAction} className="space-y-4">
        <div className="grid gap-3">
          {THEMES.map((t) => (
            <label
              key={t.value}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised p-4 text-sm hover:border-accent"
            >
              <input type="radio" name="activeTheme" value={t.value} defaultChecked={theme.activeTheme === t.value} className="mt-1" />
              <span>
                <span className="block font-medium text-ink">{t.label}</span>
                <span className="text-muted">{t.description}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised p-4 text-sm hover:border-accent">
          <input type="checkbox" name="customerDemoMode" defaultChecked={theme.customerDemoMode} className="mt-1" />
          <span>
            <span className="block font-medium text-ink">4. Customer Demo Mode</span>
            <span className="text-muted">
              API anahtarlarını, iç işçilik maliyetlerini, kâr marjlarını ve geliştirici loglarını gizler.
              Müşteriye/ortağa gösterim için güvenlidir.
            </span>
          </span>
        </label>

        <button type="submit" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Kaydet
        </button>
      </form>
    </div>
  );
}
