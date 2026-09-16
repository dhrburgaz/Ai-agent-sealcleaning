/**
 * Agent 05 — Dutch Sales & Messaging (master spec section 5 / 41).
 * Template-based, zero-AI by default: these render deterministically from
 * structured facts, so customer communication keeps working at a €0 AI budget
 * (section 2). Never fabricate business facts not present in `BusinessFacts`.
 */

export interface BusinessFacts {
  companyName: string;
  baseCity: string;
  phone?: string;
}

export type MessageTemplateKey =
  | 'first_response'
  | 'ask_photos'
  | 'ask_dimensions'
  | 'ask_access'
  | 'ask_customer_supplied_materials'
  | 'ask_preferred_timing'
  | 'indicative_price_range'
  | 'site_visit_proposal'
  | 'follow_up'
  | 'quote_sent'
  | 'polite_decline'
  | 'review_request';

export interface TemplateContext {
  facts: BusinessFacts;
  lowPrice?: number;
  highPrice?: number;
  includedItems?: string[];
  unknownFactors?: string[];
  proposedSlot1?: string;
  proposedSlot2?: string;
  customerFirstName?: string;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);
}

const TEMPLATES: Record<MessageTemplateKey, (ctx: TemplateContext) => string> = {
  first_response: (ctx) =>
    `Goedenavond, ik zag uw bericht. Dit kunnen wij zeker voor u verzorgen. Wij komen uit de gemeente ${ctx.facts.baseCity} en zijn bekend in ${ctx.facts.baseCity} en omgeving. Zou u een paar foto's kunnen sturen, samen met de ongeveer afmetingen en hoe de tuin bereikbaar is? Dan kan ik eerst een realistische prijsindicatie maken.`,

  ask_photos: () =>
    `Zou u een paar foto's van de huidige situatie kunnen sturen? Dan kan ik de werkzaamheden beter inschatten.`,

  ask_dimensions: () =>
    `Kunt u de ongeveer afmetingen doorgeven (bijvoorbeeld in m² of lengte x breedte)? Dat helpt mij om een realistische inschatting te maken.`,

  ask_access: () =>
    `Hoe is de tuin/werklocatie bereikbaar? Is er bijvoorbeeld een pad aan de zijkant of achterom, en hoe breed is deze ongeveer?`,

  ask_customer_supplied_materials: () =>
    `Levert u zelf materiaal (bijvoorbeeld tegels), of verzorgen wij dit? Dit maakt namelijk verschil voor de prijsopbouw.`,

  ask_preferred_timing: () =>
    `Wat is uw voorkeur qua periode voor uitvoering? Dan kijk ik of dit in de planning past.`,

  indicative_price_range: (ctx) => {
    const range =
      ctx.lowPrice !== undefined && ctx.highPrice !== undefined
        ? `tussen ${formatEur(ctx.lowPrice)} en ${formatEur(ctx.highPrice)}`
        : 'nog niet vast te stellen zonder aanvullende informatie';
    const included = ctx.includedItems?.length ? `, inclusief ${ctx.includedItems.join(', ')}` : '';
    const unknowns = ctx.unknownFactors?.length
      ? ` De definitieve prijs hangt vooral af van ${ctx.unknownFactors.join(', ')}.`
      : '';
    return `Op basis van de informatie die ik nu heb, verwacht ik dat het werk ongeveer ${range} uitkomt${included}. Dit is nog een prijsindicatie.${unknowns} Als deze orde van grootte voor u passend is, kunnen we de details doornemen of een korte afspraak inplannen.`;
  },

  site_visit_proposal: (ctx) =>
    `Om een nauwkeurige prijs te kunnen geven, stel ik voor om langs te komen voor een korte opname.${
      ctx.proposedSlot1 ? ` Zou ${ctx.proposedSlot1}` : ''
    }${ctx.proposedSlot2 ? ` of ${ctx.proposedSlot2}` : ''}${
      ctx.proposedSlot1 ? ' schikken?' : ' Wanneer komt het u uit?'
    }`,

  follow_up: () =>
    `Goedemiddag, ik wilde nog even navragen of u nog interesse heeft in de werkzaamheden. Als u de foto's/afmetingen doorstuurt, kan ik de inschatting verder voor u uitwerken.`,

  quote_sent: (ctx) =>
    `Bedankt voor uw aanvraag. Hierbij ontvangt u de offerte van ${ctx.facts.companyName}. Mocht u nog vragen hebben, hoor ik het graag.`,

  polite_decline: (ctx) =>
    `Bedankt voor uw aanvraag. Helaas kunnen wij dit op dit moment niet voor u verzorgen. Wij wensen u veel succes met het vinden van een geschikte partij.${
      ctx.facts.phone ? ` Mocht u vragen hebben, dan kunt u ons bereiken op ${ctx.facts.phone}.` : ''
    }`,

  review_request: (ctx) =>
    `Bedankt dat u voor ${ctx.facts.companyName} heeft gekozen. Zou u zo vriendelijk willen zijn om een korte review achter te laten? Dit helpt ons enorm.`,
};

export function renderTemplate(key: MessageTemplateKey, ctx: TemplateContext): string {
  return TEMPLATES[key](ctx);
}

export function availableTemplateKeys(): MessageTemplateKey[] {
  return Object.keys(TEMPLATES) as MessageTemplateKey[];
}
