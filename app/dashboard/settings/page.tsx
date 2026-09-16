import { getCompanyProfile, getOrCreateBudgetPolicy } from '@/lib/server/repo';
import { updateCompanySettingsAction, updateBudgetAction } from './actions';

export default async function SettingsPage() {
  const company = await getCompanyProfile();
  const budget = await getOrCreateBudgetPolicy();
  if (!company) return null;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-ink">Ayarlar</h1>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gold">Fiyatlandırma politikası</h2>
        <form action={updateCompanySettingsAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Hedef kâr marjı (%)" name="targetMarginPercent" defaultValue={(company.defaultTargetMarginRate * 100).toString()} />
          <Field label="Minimum kâr hedefi (€)" name="minimumTargetGrossProfit" defaultValue={company.defaultMinimumTargetGrossProfit.toString()} />
          <Field label="Minimum iş ücreti (€)" name="minimumJobCharge" defaultValue={company.defaultMinimumJobCharge.toString()} />
          <Field label="KDV oranı (%)" name="vatRatePercent" defaultValue={company.vatRatePercent.toString()} />
          <label className="flex flex-col gap-1 text-sm text-muted">
            Onay modu
            <select name="approvalMode" defaultValue={company.approvalMode} className="rounded-lg border border-border bg-surface px-3 py-2 text-ink">
              <option value="draft_only">Draft Only</option>
              <option value="smart_approval">Smart Approval (varsayılan)</option>
              <option value="autopilot">Autopilot</option>
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2">
            Kaydet
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gold">AI bütçesi</h2>
        <p className="mb-3 text-sm text-muted">
          Varsayılan €0. Ücretli AI çağrıları bütçe olmadan otomatik olarak engellenir (bkz. docs/AI_COST_CONTROL.md).
        </p>
        <form action={updateBudgetAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Aylık bütçe (€)" name="monthlyCapEur" defaultValue={budget.monthlyCapEur.toString()} />
          <Field label="Günlük bütçe (€)" name="dailyCapEur" defaultValue={budget.dailyCapEur.toString()} />
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2">
            Kaydet
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      <input
        name={name}
        type="number"
        step="0.01"
        defaultValue={defaultValue}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
      />
    </label>
  );
}
