import { BeyzaCallScreen } from '@/components/beyza/call/BeyzaCallScreen';

/**
 * Redesign instruction #5/#23 — "BEYZA'YI ARA": a full-screen, app/browser
 * voice conversation, clearly distinct from a real PSTN phone call. See
 * docs/AVATAR.md for why this uses the AI Core (AbstractAICoreRenderer)
 * rather than a claimed "telephone network call" or a fabricated human
 * avatar face.
 */
export default function BeyzaCallPage() {
  return <BeyzaCallScreen />;
}
