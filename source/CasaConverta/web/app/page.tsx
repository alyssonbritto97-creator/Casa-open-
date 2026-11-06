'use client';
import { gs, useHouseState } from './useState';

const monthOf = (d: string) => (d || '').slice(0, 7);

export default function Resumo() {
  const { state, error } = useHouseState();
  if (error) return <p className="card">{error}</p>;
  if (!state) return <p className="muted">Carregando…</p>;

  const month = monthOf(state.today);
  const people = state.members.filter((m) => m.active);
  const spent = state.expenses.filter((e) => monthOf(e.date) === month).reduce((a, e) => a + e.amount, 0);
  const goal = Number(state.settings.monthly_goal || 0);
  const parts = state.docs.parts || [];
  const problems = parts.filter((p) => p.status === 'broken').length;
  const perPerson = people.length ? spent / people.length : 0;

  return (
    <>
      <section className="hero">
        <small>CUSTO DA CASA NO MÊS</small>
        <div className="big">{gs(spent)}</div>
        <div>{goal ? `Meta ${gs(goal)} · ${Math.round((spent / goal) * 100)}%` : 'Defina a meta do mês no app.'}</div>
      </section>
      <section className="grid">
        <div className="card"><span className="muted">Por pessoa</span><b>{gs(perPerson)}</b></div>
        <div className="card"><span className="muted">Pessoas na casa</span><b>{people.length}</b></div>
        <div className="card"><span className="muted">Partes com problema</span><b>{problems}</b></div>
      </section>
      <section className="card">
        <h2>Quem pagou no mês</h2>
        <table>
          <tbody>
            {people.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{gs(state.expenses.filter((e) => e.member_id === m.id && monthOf(e.date) === month).reduce((a, e) => a + e.amount, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
