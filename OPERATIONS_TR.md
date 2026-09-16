# BEYZA SECURITY — Günlük Operasyon Rehberi (Türkçe)

## Günlük akış

1. **Komuta Merkezi**'ni açın. "Beyza'ya Sor" kutusuna `Beyza, durumlar ne?` yazın — son 24 saat, sıcak lead'ler, bekleyen teklifler, gecikmiş takipler AI olmadan özetlenir.
2. **Lead'ler** sayfasından yeni bir talep girin (manuel giriş): müşteri adı, hizmet kategorisi, konum, ham metin. Sistem otomatik olarak:
   - aynı telefon/e-posta ile eşleşen kayıt varsa **birleştirir** (mükerrer oluşturmaz),
   - hizmet uyumu, ölçek, aciliyet, bilgi kalitesine göre **sıcak/ılık/soğuk/yetersiz bilgi** olarak önceliklendirir.
3. Lead detayında, ihtiyaç varsa müşteriye Hollandaca şablon mesaj taslağı hazırlayın (`Taslak oluştur / Gönder`). Varsayılan mod **Smart Approval**'dır: ilk temas ve teklif gönderimi için onay kutusunu işaretlemeniz gerekir.
4. **40 m² Keramik Teras** gibi standart işler için hazır şablonu kullanın: alan, tegel kaynağı (biz mi müşteri mi), erişim genişliği, afvoer dahil mi girin — fiyat otomatik hesaplanır.
5. Fiyat her zaman **€1.200 kâr hedefini** karşılayacak şekilde önerilir; hedefin altına düşerseniz sistem bunu açıkça gösterir ve gerekçesiz geçmenize izin vermez.
6. `Teklif oluştur (PDF)` ile bağlayıcı teklif oluşturun. Sistem son bir kontrol yapar (QA kapısı): eksik/doğrulanmamış ölçüm varsa, matematik tutmuyorsa, ya da onay olmadan gönderim deneniyorsa **engeller** ve nedenini söyler.
7. Teklif onaylandıktan sonra "Gönderildi" işaretleyin, müşteri kabul edince "Kabul etti" ile lead **WON** durumuna geçer.
8. **İşler** sayfasında kazanılan lead'den iş oluşturun, tamamlandığında gerçek maliyetleri girin (elle veya dikte önizlemesiyle) — tahmin/gerçek karşılaştırması ve €1.200 hedefinin tutup tutmadığı gösterilir.

## Teklif onayı

- **Draft Only**: hiçbir şey otomatik gönderilmez.
- **Smart Approval** (varsayılan): ilk temas, teklif ve randevular onay ister.
- **Autopilot**: yalnızca sahibin açıkça etkinleştirdiği bağlayıcılar için, yüksek değerli/düşük marjlı işlemler yine onay isteyebilir. Sistem kendi kendine otopilotu asla açmaz.

## Fiyat listesi güncelleme

Yeni malzeme/hizmet eklerken kaynak (`source`) girmezseniz kalem otomatik olarak `NEEDS_OWNER_VERIFICATION` işaretlenir — sahte "güncel piyasa fiyatı" asla eklenmez. Doğruladığınızda "Doğrula" ile onaylayın.

## Tedarikçi/fırsat kaydı

"İndirim/fırsat" etiketi yalnızca bir kanıt URL'si ile birlikte kabul edilir. Kanıtsız etiket sistemde "Reddedildi: kanıt yok" olarak gösterilir.

## Durum takibi

Her lead 22 durumdan birinde bulunur (NEW → ... → WON/LOST → ARCHIVED). Her geçiş denetim kaydına (`audit_logs`) yazılır — "Neden?" bölümünden geçmişi görebilirsiniz.

## Bekleyen/gecikmiş öğeler

Komuta Merkezi'ndeki uyarı kartları (cevap bekleyen, gecikmiş takip, tedarikçi uyarısı, bağlayıcı hatası) €0 bütçede bile canlı veritabanı durumundan hesaplanır — hiçbiri sahte/placeholder değildir; sıfırsa kart görünmez.

## Arızalar

- Bir bağlayıcı (AI sağlayıcı, takvim vb.) başarısız olursa Sistem Sağlığı'nda görünür; bu Faz 5-7'de tam olarak devreye girecek altyapıdır.
- Fiyat hesaplaması tutmuyorsa veya teklif engellenmişse, ekrandaki gerekçe metnini okuyun — sistem asla sessizce bir sorunu görmezden gelmez.
