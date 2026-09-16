'use client';

import { useActionState, useState } from 'react';
import { completeSetupAction, type SetupState } from '@/app/setup/actions';
import { SERVICE_CATEGORIES } from '@/lib/business/service-categories';

const initialState: SetupState = {};

const STEP_TITLES = [
  'BEYZA SECURITY kurulumu',
  'Şirket bilgileri',
  'Hizmet bölgesi',
  'Hizmetler',
  'Ekip',
  'Fiyatlandırma',
  'AI bütçesi',
  'Tema',
  'Sahip hesabı',
];

export function SetupWizard() {
  const [state, formAction, pending] = useActionState(completeSetupAction, initialState);
  const [step, setStep] = useState(0);
  const lastStep = STEP_TITLES.length - 1;

  return (
    <form action={formAction} className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        {STEP_TITLES.map((title, i) => (
          <div
            key={title}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised p-8 shadow-premium">
        <h2 className="mb-6 text-xl font-semibold text-ink">{STEP_TITLES[step]}</h2>

        <section hidden={step !== 0} className="space-y-3 text-muted">
          <p>Beyza, Dordrecht ve çevresinde faaliyet gösteren bahçe/bakım işletmeniz için komuta merkezidir.</p>
          <p>Kurulum birkaç dakika sürer. Varsayılan AI bütçesi €0&apos;dır — sistem AI olmadan da tam çalışır.</p>
        </section>

        <section hidden={step !== 1} className="grid gap-4 sm:grid-cols-2">
          <Field label="Şirket adı" name="companyName" required />
          <Field label="Telefon" name="phone" />
          <Field label="E-posta" name="email" />
          <Field label="Website" name="website" />
          <Field label="KVK numarası" name="kvkNumber" />
          <Field label="BTW numarası" name="vatNumber" />
          <Field label="Adres" name="address" className="sm:col-span-2" />
        </section>

        <section hidden={step !== 2} className="grid gap-4 sm:grid-cols-2">
          <Field label="Merkez şehir" name="baseCity" defaultValue="Dordrecht" required />
          <Field label="Eyalet" name="province" defaultValue="Zuid-Holland" required />
          <Field
            label="Hizmet yarıçapı (km)"
            name="serviceRadiusKm"
            type="number"
            defaultValue="35"
            required
          />
        </section>

        <section hidden={step !== 3} className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
          {SERVICE_CATEGORIES.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="enabledServiceCategories"
                value={c.key}
                defaultChecked
                className="h-4 w-4 rounded border-border"
              />
              {c.labelNl}
            </label>
          ))}
        </section>

        <section hidden={step !== 4} className="grid gap-4 sm:grid-cols-2">
          <Field label="Sahibin adı" name="ownerDisplayName" required />
          <Field
            label="Sahip saatlik maliyeti (€)"
            name="ownerHourlyCost"
            type="number"
            step="0.01"
            defaultValue="35"
            required
          />
        </section>

        <section hidden={step !== 5} className="grid gap-4 sm:grid-cols-2">
          <Field label="Hedef kâr marjı (%)" name="targetMarginPercent" type="number" defaultValue="30" required />
          <Field
            label="Minimum kâr hedefi (€)"
            name="minimumTargetGrossProfit"
            type="number"
            defaultValue="1200"
            required
          />
          <Field label="Minimum iş ücreti (€)" name="minimumJobCharge" type="number" defaultValue="150" required />
          <Field label="KDV oranı (%)" name="vatRatePercent" type="number" defaultValue="21" required />
        </section>

        <section hidden={step !== 6} className="space-y-4">
          <p className="text-sm text-muted">
            Varsayılan ücretli AI bütçesi €0&apos;dır. Sistem bu bütçeyle tamamen çalışır; AI sağlayıcılarını
            daha sonra Ayarlar&apos;dan yapılandırabilirsiniz.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Aylık AI bütçesi (€)" name="aiMonthlyBudgetEur" type="number" defaultValue="0" required />
            <Field label="Günlük AI bütçesi (€)" name="aiDailyBudgetEur" type="number" defaultValue="0" required />
          </div>
        </section>

        <section hidden={step !== 7} className="grid gap-3 sm:grid-cols-3">
          {[
            { value: 'ay-yildiz-dark-red', label: 'Ay-Yıldız Dark Red' },
            { value: 'classic-premium-dark', label: 'Classic Premium Dark' },
            { value: 'neutral-business-light', label: 'Neutral Business Light' },
          ].map((theme, i) => (
            <label
              key={theme.value}
              className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border p-4 text-sm text-ink hover:border-accent"
            >
              <input type="radio" name="activeTheme" value={theme.value} defaultChecked={i === 0} />
              {theme.label}
            </label>
          ))}
        </section>

        <section hidden={step !== 8} className="grid gap-4 sm:grid-cols-2">
          <Field label="Şifre" name="ownerPassword" type="password" required className="sm:col-span-2" />
          <p className="text-xs text-muted sm:col-span-2">En az 10 karakter, en az bir harf ve bir rakam.</p>
        </section>

        {state.error && <p className="mt-4 text-sm text-accent">{state.error}</p>}

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink disabled:opacity-30"
          >
            Geri
          </button>
          {step < lastStep ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(lastStep, s + 1))}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              İleri
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {pending ? 'Kuruluyor…' : 'Beyza hazır.'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  step,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-muted ${className ?? ''}`}>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
      />
    </label>
  );
}
