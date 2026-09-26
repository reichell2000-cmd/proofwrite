"use client";
import { useEffect, useMemo, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { RichDocument } from "./RichDocument";
import { time } from "./Shell";
import type { Submission } from "../core/model";
import { EMPTY_DOC } from "../core/model";
import { buildTimeline } from "../core/timeline/build";
import { replayAt } from "../core/evidence/replay";
export function Replay({
  submission: s,
  target,
}: {
  submission: Submission;
  target?: number;
}) {
  const [seq, setSeq] = useState(target || 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(20);
  const [skip, setSkip] = useState(true);
  const markers = useMemo(() => buildTimeline(s.events), [s.events]);
  useEffect(() => {
    if (target !== undefined) {
      setSeq(target);
      setPlaying(false);
    }
  }, [target]);
  const current = s.events.find((e) => e.seq === seq);
  const last = s.events.at(-1)?.seq || 0;
  useEffect(() => {
    if (!playing) return;
    const next = s.events.find((e) => e.seq > seq);
    if (!next) {
      setPlaying(false);
      return;
    }
    const gap = next.at - (current?.at || next.at);
    const wait = (skip ? Math.min(gap, 2000) : gap) / speed;
    const timer = setTimeout(() => setSeq(next.seq), Math.max(16, wait));
    return () => clearTimeout(timer);
  }, [playing, seq, s.events, current, speed, skip]);
  const document = useMemo(() => {
    try {
      return { doc: replayAt(s.events, s.snapshots, seq), error: "" };
    } catch {
      return {
        doc: EMPTY_DOC,
        error: "이 시점의 문서를 재구성하지 못했습니다.",
      };
    }
  }, [s.events, s.snapshots, seq]);
  const jump = (value: number) => {
    setSeq(value);
    setPlaying(false);
  };
  return (
    <section className="replay panel">
      <div className="section-heading">
        <div>
          <p className="overline">WRITING REPLAY</p>
          <h3>생각이 글이 된 순간들</h3>
        </div>
        <small>
          {seq} / {last} 기록
        </small>
      </div>
      <div className="play-controls">
        <button
          className="primary"
          aria-label={playing ? "재생 일시정지" : "작성과정 재생"}
          onClick={() => {
            if (seq >= last) setSeq(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button aria-label="처음으로" onClick={() => jump(0)}>
          <RotateCcw size={16} />
        </button>
        <select
          aria-label="재생 속도"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          {[1, 5, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}x
            </option>
          ))}
        </select>
        <label className="check-label">
          <input
            type="checkbox"
            checked={skip}
            onChange={(e) => setSkip(e.target.checked)}
          />
          긴 정지는 2초로 줄이기
        </label>
      </div>
      <input
        type="range"
        aria-label="작성 시점"
        min={0}
        max={Math.max(1, last)}
        value={seq}
        onChange={(e) => jump(Number(e.target.value))}
      />
      <div className="timeline-caption">
        <span>{current ? time(current.at) : "작성 시작 전"}</span>
        <span>이벤트와 문서 버전으로 재구성</span>
      </div>
      <div className="timeline-markers">
        {markers.map((m, i) => (
          <button
            key={`${m.eventSeq}-${i}`}
            className={`timeline-marker ${m.kind} ${seq === m.eventSeq ? "selected" : ""}`}
            onClick={() => jump(m.eventSeq)}
            title={time(m.at)}
          >
            <i />
            {m.label}
          </button>
        ))}
      </div>
      <div className="replay-page">
        {document.error ? (
          <p role="alert">{document.error}</p>
        ) : (
          <RichDocument doc={document.doc} />
        )}
      </div>
      <details className="versions">
        <summary>문서 버전 {s.snapshots.length}개</summary>
        <div>
          {s.snapshots.map((snapshot, i) => (
            <button key={snapshot.id} onClick={() => jump(snapshot.seq)}>
              버전 {i + 1}
              <small>
                {time(snapshot.at)} · {snapshot.charCount}자
              </small>
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}
