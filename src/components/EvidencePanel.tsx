import type { EvidenceAxis } from "../core/proof/five-evidence";
export function EvidencePanel({ axes }: { axes: EvidenceAxis[] }) {
  return (
    <section className="evidence-panel" aria-label="다섯 가지 과정 증거">
      <div className="section-heading">
        <div>
          <p className="overline">PROOFME · FIVE EVIDENCES</p>
          <h2>다섯 가지 과정 증거</h2>
        </div>
        <span className="evidence-count">
          {axes.filter((a) => a.available).length}/5 항목에 관찰 자료
        </span>
      </div>
      <p className="muted">
        1·2·3·5는 자동 기록, 4는 작성자가 남긴 근거입니다. 자료가 없는 항목은
        0점으로 처리하지 않습니다.
      </p>
      <div className="evidence-grid">
        {axes.map((a, index) => (
          <article className="evidence-card" key={a.id}>
            <div className="evidence-label">
              <span>0{index + 1}</span>
              <small>{a.source}</small>
            </div>
            <h3>{a.title}</h3>
            <b className="evidence-status">{a.status}</b>
            <ul>
              {a.facts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
            <p className="fine-print">{a.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
