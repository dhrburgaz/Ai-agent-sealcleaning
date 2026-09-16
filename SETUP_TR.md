# BEYZA SECURITY — Kurulum Rehberi (Türkçe)

## 1. Gereksinimler

- Node.js 22+ (LTS)
- npm 10+
- Linux/macOS önerilir (Windows'ta WSL2 ile de çalışır)

## 2. İlk kurulum

```bash
cp .env.example .env.local
```

`.env.local` dosyasını açın ve en az şunu ayarlayın:

```
SESSION_SECRET=<openssl rand -hex 32 ile üretilen 32+ karakterlik rastgele değer>
```

Bağımlılıkları kurun ve veritabanını oluşturun:

```bash
npm install
npm run db:migrate
npm run dev
```

Tarayıcıda `http://localhost:3000` adresine gidin. Henüz kullanıcı olmadığı için otomatik olarak kurulum sihirbazına yönlendirilirsiniz.

## 3. "Abonelik" ile "API kredisi" farkı — ÖNEMLİ

Bu sistem varsayılan olarak **€0 AI bütçesi** ile çalışır ve tamamen kullanılabilir durumdadır: lead yönetimi, fiyatlandırma, teklif, Hollandaca mesaj şablonları, "Durumlar ne?" briefingi — hepsi AI olmadan çalışır.

İleride ücretli bir AI sağlayıcı eklemek isterseniz şunu bilin:
- **Claude/ChatGPT/Gemini abonelik hesabınız, o sağlayıcının API'sine erişim vermez.** API kullanımı ayrı, kullanım bazlı faturalandırılan bir üründür.
- Bir tarayıcı oturumunu (cookie/token) API gibi kullanmak hem teknik olarak kırılgandır hem de sağlayıcı kurallarını ihlal eder — bu sistem bunu asla yapmaz.
- "Ücretsiz katman" kalıcı ücretsiz anlamına gelmez; sağlayıcılar koşulları değiştirebilir.

Sistem, API anahtarı girip bütçe tanımlamadığınız sürece hiçbir ücretli çağrı yapmaz (`lib/ai/router.ts`).

## 4. Facebook / sosyal medya lead yakalama — gerçekçi beklenti

Şu an desteklenen: **manuel yakalama** (lead'i elle girme, mesaj metnini yapıştırma). Facebook'un otomatik/gizli kazıma (scraping) veya toplu mesajlaşmaya izin vermediğini unutmayın — bu sistem bunu asla yapmaz. Tarayıcı uzantısı ve yarı-otomatik "tespit et + taslak hazırla + onayla" akışı ileride eklenecektir (bkz. `docs/FACEBOOK_CONNECTOR.md`).

## 5. Sesli komut arayüzü

Faz 8'de eklenecek (bkz. `progress.md`). Şu anda "Beyza'ya Sor" metin kutusu Komuta Merkezi'nde çalışır durumdadır ve sınırlı bir komut setini (bkz. `docs/AGENTS.md`, Agent 01) hiçbir AI harcaması olmadan yanıtlar.

## 6. Yedekleme

```bash
npm run backup                # storage/backups/ altına zaman damgalı arşiv oluşturur
npm run restore -- <dosya>    # onay ister, geri yükler
```

`.env` / `.env.local` dosyaları (şifreler, gizli anahtarlar) yedeğe **dahil edilmez** — bunları ayrıca ve şifreli şekilde saklayın.

## 7. Docker ile çalıştırma

```bash
cp .env.example .env
# .env içine SESSION_SECRET ekleyin
docker compose up --build
```

Not: Bu depo içindeki `Dockerfile`/`docker-compose.yml` yazılmış ve gözden geçirilmiştir, ancak bu geliştirme ortamında bir Docker daemon bulunmadığı için gerçek bir `docker build` ile doğrulanamamıştır — production'a almadan önce kendi ortamınızda test edin.

## 8. Devam eden fazlar

Bu kurulum Faz 1–3'ü (temel altyapı, CRM, fiyatlandırma, teklif) kapsar. Sesli arayüz, canlı tedarikçi taraması, takvim entegrasyonu, Facebook otomasyonu gibi özellikler sonraki fazlardadır — bkz. `progress.md`.
