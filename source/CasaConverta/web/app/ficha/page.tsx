'use client';
import { gs, useHouseState } from '../useState';
import type { Doc } from '../useState';

const PART: Record<string, string> = { roof: 'Telhado', gutter: 'Calhas', tank: "Caixa d'água", ceiling: 'Forro e teto interno', walls: 'Paredes e pintura', windows: 'Janelas e portas', wall: 'Muro', gate: 'Portão e fechaduras', garden: 'Quintal e jardim', electric: 'Instalação elétrica', plumbing: 'Encanamento', sewer: 'Esgoto e fossa', gas: 'Gás', sala: 'Sala', cozinha: 'Cozinha', banheiro: 'Banheiro', quarto1: 'Quarto 1', quarto2: 'Quarto 2' };
const STATUS: Record<string, string> = { ok: 'Em dia', watch: 'Atenção', broken: 'Precisa consertar', fixing: 'Em conserto', unk: 'Não avaliada' };

export default function Ficha() {
  const { state, error } = useHouseState();
  if (error) return <p className="card">{error}</p>;
  if (!state) return <p className="muted">Carregando…</p>;

  const info: Doc = (state.docs.property || []).find((d) => d.key === 'info') || { id: 0 };
  const parts = state.docs.parts || [];
  const assets = state.docs.assets || [];
  const papers = state.docs.papers || [];
  const name = (id: number) => state.members.find((m) => m.id === id)?.name || '—';
  const estimate = parts.reduce((a, p) => a + (p.est || 0), 0);
  const yearly = parts.reduce((a, p) => a + (p.yearly || 0), 0);

  return (
    <>
      <h1>Ficha do imóvel</h1>
      <p className="muted">{info.addr || 'Endereço não informado'}{info.owner ? ` · ${info.owner}` : ''}</p>
      <section className="grid">
        <div className="card"><span className="muted">Terreno</span><b>{info.land ? `${info.land} m²` : '—'}</b></div>
        <div className="card"><span className="muted">Construído</span><b>{info.built ? `${info.built} m²` : '—'}</b></div>
        <div className="card"><span className="muted">Quartos / banheiros</span><b>{info.rooms || '—'} / {info.baths || '—'}</b></div>
        <div className="card"><span className="muted">Valor estimado</span><b>{info.value ? gs(info.value) : '—'}</b></div>
      </section>
      <section className="card">
        <h2>Estado de cada parte</h2>
        <table>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id}><td>{PART[p.key || ''] || p.key}</td><td>{STATUS[p.status] || '—'}</td><td>{name(p.resp)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Reparos previstos: {gs(estimate)} · Manutenção por ano: {gs(yearly)}</p>
      </section>
      <section className="card">
        <h2>Bens e documentos</h2>
        <table>
          <tbody>
            {assets.map((a) => (<tr key={'a' + a.id}><td>{a.name}</td><td>{a.place}</td><td>{a.value ? gs(a.value) : ''}</td></tr>))}
            {papers.map((p) => (<tr key={'p' + p.id}><td>{p.name}</td><td>vence {p.due || '—'}</td><td>{p.cost ? gs(p.cost) : ''}</td></tr>))}
          </tbody>
        </table>
      </section>
      <button className="btn" onClick={() => window.print()}>Imprimir ficha</button>
    </>
  );
}
