/** Section 3 — core service categories. Owner can enable/disable each one. */
export const SERVICE_CATEGORIES = [
  { key: 'tuinonderhoud', labelNl: 'Tuinonderhoud' },
  { key: 'tuin_opruimen', labelNl: 'Tuin opruimen' },
  { key: 'schuur_leegmaken', labelNl: 'Schuur leegmaken / opruimen' },
  { key: 'snoeiwerk', labelNl: 'Snoeiwerk' },
  { key: 'onkruid_verwijderen', labelNl: 'Onkruid verwijderen' },
  { key: 'schuttingen_plaatsen', labelNl: 'Schuttingen plaatsen' },
  { key: 'schuttingen_vervangen', labelNl: 'Schuttingen vervangen' },
  { key: 'hekken_plaatsen', labelNl: 'Hekken plaatsen' },
  { key: 'poorten_plaatsen', labelNl: 'Poorten plaatsen' },
  { key: 'bestrating_verwijderen', labelNl: 'Bestrating verwijderen' },
  { key: 'bestrating_leggen', labelNl: 'Bestrating leggen' },
  { key: 'keramische_buitentegels', labelNl: 'Keramische buitentegels leggen' },
  { key: 'terrassen_aanleggen', labelNl: 'Terrassen aanleggen' },
  { key: 'grondwerk', labelNl: 'Grondwerk' },
  { key: 'zandbed_voorbereiden', labelNl: 'Zandbed voorbereiden' },
  { key: 'verdichten_trilplaat', labelNl: 'Verdichten / trilplaatwerk' },
  { key: 'afvoer_materiaal', labelNl: 'Afvoer oud materiaal' },
  { key: 'groenafval_afvoeren', labelNl: 'Groenafval afvoeren' },
  { key: 'kleine_klussen', labelNl: 'Kleine onderhouds- en herstelklussen' },
  { key: 'buitenoppervlak_reinigen', labelNl: 'Buitenoppervlak reinigen / pressure cleaning' },
  { key: 'seal_cleaning', labelNl: 'Seal-cleaning gerelateerde werkzaamheden' },
] as const;

export type ServiceCategoryKey = (typeof SERVICE_CATEGORIES)[number]['key'];
