import { test, expect } from '@playwright/test';

/**
 * Section 61 — end-to-end smoke flow. Run manually with a fresh DB against a
 * running dev server: `npx playwright test tests/e2e/smoke.spec.ts`.
 * Not part of `npm run check` (no Playwright browsers guaranteed in CI yet);
 * see docs for how to wire this into CI once Playwright is provisioned there.
 */

test('setup wizard -> login -> lead -> estimate -> quote PDF', async ({ page }) => {
  await page.goto('/setup');
  await expect(page.getByText('BEYZA SECURITY kurulumu')).toBeVisible();

  // Step 0 -> 1 (company info)
  await page.getByRole('button', { name: 'İleri' }).click();
  await page.getByLabel('Şirket adı').fill('E2E Test Hovenier');

  // Step 1 -> 2 (service area, defaults are fine)
  await page.getByRole('button', { name: 'İleri' }).click();

  // Step 2 -> 3 (services, keep defaults)
  await page.getByRole('button', { name: 'İleri' }).click();

  // Step 3 -> 4 (crew)
  await page.getByRole('button', { name: 'İleri' }).click();
  await page.getByLabel('Sahibin adı').fill('E2E Owner');

  // Step 4 -> 5 (pricing, defaults are fine)
  await page.getByRole('button', { name: 'İleri' }).click();

  // Step 5 -> 6 (AI budget, defaults are fine)
  await page.getByRole('button', { name: 'İleri' }).click();

  // Step 6 -> 7 (theme, default selected)
  await page.getByRole('button', { name: 'İleri' }).click();

  // Step 7 -> 8 (owner account)
  await page.getByRole('button', { name: 'İleri' }).click();
  await page.getByLabel('Şifre').fill('E2ETestPassword123');

  await page.getByRole('button', { name: 'Beyza hazır.' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Komuta Merkezi' })).toBeVisible();

  // Ask Beyza a zero-AI status question
  await page.getByPlaceholder('Beyza, durumlar ne?').fill('Beyza, durumlar ne?');
  await page.getByRole('button', { name: 'Sor' }).click();
  await expect(page.getByText('Durum net.')).toBeVisible();

  // Create a lead
  await page.goto('/dashboard/leads');
  await page.getByText('+ Yeni lead (manuel giriş)').click();
  await page.getByPlaceholder('Müşteri adı').fill('E2E Klant');
  await page.getByPlaceholder('Konum (bijv. Dordrecht)').fill('Dordrecht');
  await page.getByRole('button', { name: 'Lead oluştur' }).click();
  await expect(page).toHaveURL(/\/dashboard\/leads\/.+/);
  await expect(page.getByText('E2E Klant')).toBeVisible();

  // Build the 40m² ceramic terrace estimate
  await page.getByPlaceholder('Alan (m²)').fill('40');
  await page.getByPlaceholder('Tegel kosten €/m² (wij leveren)').fill('28');
  await page.getByRole('button', { name: 'Fiyat hesapla' }).click();
  await expect(page.getByText('Önerilen fiyat (KDV hariç):')).toBeVisible();

  // Generate the PDF quote
  await page.getByRole('button', { name: 'Teklif oluştur (PDF)' }).click();
  await expect(page.getByText(/Q-\d{4}-\d{5}/)).toBeVisible();

  // Method plan (Agent 08) should have produced at least one verification note
  // for this template's hardcoded-unknown fields, or the section is absent —
  // either way the page must not have crashed rendering it.
  await expect(page.getByRole('heading', { name: 'Fotoğraflar (Agent 06)' })).toBeVisible();

  // Ask Beyza from the lead page (leadId-scoped intent)
  await page.getByPlaceholder('Beyza, durumlar ne?').fill('Bu iş için ne eksik?');
  await page.getByRole('button', { name: 'Sor' }).last().click();
  await expect(page.locator('p.whitespace-pre-line').last()).toBeVisible();

  // Phase 4-6 pages render without a server error
  for (const [path, heading] of [
    ['/dashboard/inventory', 'Envanter'],
    ['/dashboard/settings/ai-usage', 'AI Kullanım Panosu'],
    ['/dashboard/suppliers', 'Tedarikçiler & Fırsatlar'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  // Phase 7-8 pages render without a server error, including their forms
  await page.goto('/dashboard/calendar');
  await expect(page.getByRole('heading', { name: 'Takvim', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Takvimi indir (.ics)' })).toBeVisible();

  await page.goto('/dashboard/follow-ups');
  await expect(page.getByRole('heading', { name: 'Takip mesajları' })).toBeVisible();

  await page.goto('/dashboard/finance');
  await expect(page.getByRole('heading', { name: 'Finans & Raporlama' })).toBeVisible();

  // ICS export route returns a real calendar file, not an error page
  const icsResponse = await page.request.get('/api/calendar/ics');
  expect(icsResponse.status()).toBe(200);
  expect(icsResponse.headers()['content-type']).toContain('text/calendar');
  expect(await icsResponse.text()).toContain('BEGIN:VCALENDAR');
});
