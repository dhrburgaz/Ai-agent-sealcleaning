# Privacyverklaring (sjabloon) — Beyza Security

> **Dit is geen juridisch advies.** Dit is een aanpasbare startsjabloon. Laat een
> jurist of AVG/GDPR-adviseur dit controleren voordat u het publiceert of aan
> klanten toont. Vul de placeholders `[...]` in met uw eigen gegevens.

## 1. Wie zijn wij

`[Bedrijfsnaam]`, gevestigd in `[plaats]`, is verwerkingsverantwoordelijke voor
de persoonsgegevens die worden verwerkt via dit systeem (Beyza Security).

## 2. Welke gegevens verwerken wij

- Naam, telefoonnummer, e-mailadres, adres van (potentiële) klanten
- Projectlocatie en -omschrijving
- Foto's van de werklocatie (indien aangeleverd)
- Communicatiegeschiedenis (berichten, offertes)
- Facturatie-/betaalgerelateerde gegevens waar van toepassing

## 3. Doeleinden

- Het opstellen van prijsindicaties en offertes
- Het plannen en uitvoeren van werkzaamheden
- Klantcommunicatie en nazorg (bijv. reviewverzoek)
- Wettelijke bewaarplicht (administratie/boekhouding)

## 4. Bewaartermijn

Standaard ingesteld op `[aantal]` dagen (instelbaar in Instellingen). Gegevens
worden niet langer bewaard dan noodzakelijk voor bovenstaande doeleinden of een
wettelijke verplichting.

## 5. Foto's en lokale verwerking

Foto's kunnen lokaal worden opgeslagen zonder externe analyse ("local-only
mode"). Als externe (AI-)beeldanalyse wordt gebruikt, gebeurt dit alleen met
een expliciet geconfigureerde, betaalde provider — nooit standaard, en nooit
zonder dat de eigenaar dit heeft ingeschakeld.

## 6. Uw rechten

U kunt te allen tijde verzoeken om inzage, correctie of verwijdering van uw
gegevens. Neem contact op via `[e-mailadres]` of `[telefoonnummer]`.

## 7. Beveiliging

- Wachtwoorden worden gehasht opgeslagen, nooit in platte tekst.
- Bestandsuploads worden gevalideerd op type en grootte; bestandsnamen worden
  nooit direct van gebruikersinvoer afgeleid.
- Geheimen (API-sleutels) staan alleen in serverconfiguratie (`.env`), nooit in
  broncode, logs of back-ups.

## 8. Derde partijen

Standaard worden geen gegevens gedeeld met externe AI-providers (AI-budget
staat standaard op €0). Wanneer een externe provider of connector wordt
ingeschakeld, wordt dit hier expliciet aangevuld met naam, doel en
grondslag van die partij.
