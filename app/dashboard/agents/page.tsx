import { buildAgentNetwork } from '@/lib/server/agent-network';
import { AgentNetwork } from '@/components/beyza/AgentNetwork';

export default async function AgentNetworkPage() {
  const nodes = await buildAgentNetwork();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Ajan Ağı</h1>
        <p className="text-sm text-muted">
          Tam olarak 20 mantıksal ajan — sürekli konuşan 20 sohbet döngüsü değil. Çoğu deterministik koddur;
          sadece gerçekten gerektiğinde ve bütçe izin verdiğinde bir modele başvurur.
        </p>
      </div>
      <AgentNetwork nodes={nodes} />
    </div>
  );
}
