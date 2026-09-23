"use client";
import { features } from "../core/features";
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import {
  Bold,
  Italic,
  Underline,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Table,
  Image as ImageIcon,
  Link as LinkIcon,
  Search,
  IndentIncrease,
  IndentDecrease,
  ArrowUp,
  ArrowDown,
  Star,
  Check,
  Send,
  Save,
  Download,
} from "lucide-react";
import { Header, Notice, Brand } from "./Shell";
import { LearningFocus } from "./LearningFocus";
import { LearningFeedback } from "./LearningFeedback";
import { RichDocument } from "./RichDocument";
import { api, ApiError } from "../core/api";
import { extensions } from "../core/editor/extensions";
import { EvidenceCollector } from "../core/evidence/collector";
import { eventTextDelta, textOf } from "../core/evidence/replay";
import { readLocal, saveLocal, removeLocal } from "../core/storage/local";
import {
  type Assignment,
  type Submission,
  type Doc,
  type LocalDraft,
  type SyncBody,
  POLICIES,
} from "../core/model";
import type { EvidenceEventType, InputSource } from "../core/evidence/types";
type PublicAssignment = Omit<Assignment, "joinCode">;
function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Writer({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<{
    submission: Submission;
    assignment: PublicAssignment;
    local?: LocalDraft;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    async function load() {
      try {
        const data = await api<{
          submission: Submission;
          assignment: PublicAssignment;
        }>(`/api/submissions/${id}`);
        let local: LocalDraft | undefined;
        try {
          local = await readLocal(id);
        } catch {
          /* Server copy remains authoritative. */
        }
        if (cancelled) return;
        if (
          local &&
          data.submission.status === "draft" &&
          local.submission.events.length > data.submission.events.length
        ) {
          if (local.revision !== data.submission.revision)
            throw new Error(
              "서버와 이 기기의 미저장 기록이 다릅니다. 자동 덮어쓰기를 중단했습니다. 다른 탭을 닫고 아래 백업을 내려받아 보관해주세요.",
            );
          data.submission = local.submission;
        } else if (
          local &&
          local.revision === data.submission.revision &&
          local.savedAt > data.submission.updatedAt &&
          data.submission.status === "draft"
        )
          data.submission = local.submission;
        else local = undefined;
        setLoaded({ ...data, local });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    const controller = new AbortController();
    let acquired = false;
    const timer = setTimeout(() => {
      if (!cancelled && !acquired && navigator.locks) {
        setError(
          "이 글이 다른 탭에서 열려 있습니다. 다른 탭을 닫고 새로고침해주세요.",
        );
        controller.abort();
      }
    }, 1000);
    if (navigator.locks)
      navigator.locks
        .request(
          `proofwrite-${id}`,
          { signal: controller.signal },
          async () => {
            if (cancelled) return;
            acquired = true;
            clearTimeout(timer);
            setError("");
            await new Promise<void>((resolve) => {
              release = resolve;
              void load();
            });
          },
        )
        .catch((e) => {
          if (!cancelled && e.name !== "AbortError")
            setError("작성 탭을 확인하지 못했습니다. 새로고침해주세요.");
        });
    else void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
      release?.();
    };
  }, [id]);
  if (error)
    return (
      <>
        <Header />
        <main className="narrow">
          <Notice error>{error}</Notice>
          <button
            onClick={async () => {
              const draft = await readLocal(id);
              if (draft)
                download(
                  "proofwrite-recovery.json",
                  JSON.stringify(draft),
                  "application/json",
                );
            }}
          >
            이 기기의 글 백업
          </button>
        </main>
      </>
    );
  if (!loaded)
    return (
      <>
        <Header />
        <main className="narrow">
          <p className="muted">작성 공간을 준비하고 있어요…</p>
        </main>
      </>
    );
  return <WritingSpace {...loaded} />;
}
function WritingSpace({
  submission,
  assignment,
  local,
}: {
  submission: Submission;
  assignment: PublicAssignment;
  local?: LocalDraft;
}) {
  const live = useRef<Submission>(structuredClone(submission));
  const ack = useRef(local?.ackSeq ?? submission.events.at(-1)?.seq ?? 0);
  const revision = useRef(local?.revision ?? submission.revision);
  const collector = useRef<EvidenceCollector | null>(null);
  const pending = useRef<{ type?: EvidenceEventType; source: InputSource }>({
    source: "unknown",
  });
  const composing = useRef(false);
  const composition = useRef<{ before: Doc; steps: unknown[] } | null>(null);
  const dirty = useRef(local ? 1 : 0);
  const saved = useRef(0);
  const rhythmAck = useRef(local?.rhythmAck ?? submission.rhythm.length);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const checkpointSeq = useRef(submission.snapshots.at(-1)?.seq || 0);
  const checkpointAt = useRef(Date.now());
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("저장 준비 중");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(submission.status === "submitted");
  const [localWarning, setLocalWarning] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [find, setFind] = useState("");
  const [findMessage, setFindMessage] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const bump = () => {
    dirty.current++;
    setVersion((n) => n + 1);
  };
  const editor = useEditor({
    extensions: extensions(),
    content: submission.doc,
    immediatelyRender: false,
    editable: submission.status === "draft",
    editorProps: {
      attributes: {
        "aria-label": "과제 본문",
        role: "textbox",
        "aria-multiline": "true",
        spellcheck: "false",
      },
      handleDOMEvents: {
        beforeinput: (_view, event) => {
          const e = event as InputEvent;
          const history =
            e.inputType === "historyUndo"
              ? "undo"
              : e.inputType === "historyRedo"
                ? "redo"
                : undefined;
          pending.current = {
            type: history,
            source:
              e.inputType === "insertText"
                ? "keyboard"
                : e.isComposing
                  ? "composition"
                  : "unknown",
          };
          return false;
        },
        keydown: (_view, e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z")
            pending.current = {
              type: e.shiftKey ? "redo" : "undo",
              source: "editor_command",
            };
          else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y")
            pending.current = { type: "redo", source: "editor_command" };
          else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            pending.current = {
              source: composing.current ? "composition" : "keyboard",
            };
            if (
              features.free.basicMyProofPrototype &&
              live.current.rhythmOptIn &&
              !e.isComposing &&
              !e.repeat &&
              e.key !== "Process" &&
              (e.key.length === 1 ||
                ["Backspace", "Delete", "Enter", " "].includes(e.key))
            )
              collector.current?.keyDown(
                performance.now(),
                e.key === "Backspace" || e.key === "Delete",
              );
          }
          return false;
        },
        keyup: () => {
          if (
            features.free.basicMyProofPrototype &&
            live.current.rhythmOptIn &&
            !composing.current
          )
            collector.current?.keyUp();
          return false;
        },
        paste: () => {
          checkpoint();
          pending.current = { type: "paste", source: "paste" };
          return false;
        },
        cut: () => {
          pending.current = { type: "cut", source: "editor_command" };
          return false;
        },
        compositionstart: () => {
          composing.current = true;
          collector.current?.resetRhythm();
          return false;
        },
        compositionend: () => {
          setTimeout(() => {
            composing.current = false;
            if (composition.current && editorRef.current) {
              const c = composition.current;
              composition.current = null;
              capture(
                c.before,
                editorRef.current.getJSON(),
                c.steps,
                "composition",
              );
            }
          }, 0);
          return false;
        },
      },
      handleDrop: (_view, _event, _slice, moved) => {
        pending.current = {
          type: moved ? "paragraph_move" : "paste",
          source: moved ? "editor_command" : "paste",
        };
        return false;
      },
      transformPastedHTML: (html) => {
        // Strip remote images before the editor can load them. No requests to clipboard image URLs.
        const parsed = new DOMParser().parseFromString(html, "text/html");
        parsed
          .querySelectorAll("img,iframe,script,style")
          .forEach((n) => n.remove());
        return parsed.body.innerHTML;
      },
    },
    onTransaction: ({ editor, transaction }) => {
      if (
        !transaction.docChanged ||
        !collector.current ||
        live.current.status === "submitted"
      )
        return;
      if (composing.current) {
        if (!composition.current)
          composition.current = {
            before: transaction.before.toJSON(),
            steps: [],
          };
        composition.current.steps.push(
          ...transaction.steps.map((s) => s.toJSON()),
        );
        live.current.doc = editor.getJSON();
        return;
      }
      capture(
        transaction.before.toJSON(),
        editor.getJSON(),
        transaction.steps.map((s) => s.toJSON()),
        undefined,
        transaction,
      );
    },
    onSelectionUpdate: () => setVersion((n) => n + 1),
  });
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;
  function capture(
    before: Doc,
    after: Doc,
    steps: unknown[],
    source?: InputSource,
    tr?: Transaction,
  ) {
    const delta = eventTextDelta(before, after, steps);
    const metadata =
      (tr as unknown as { meta?: Record<string, unknown> })?.meta || {};
    const hist = Object.entries(metadata).find(([key]) =>
      key.startsWith("history$"),
    )?.[1] as { redo?: boolean } | undefined;
    const action = pending.current;
    const type: EvidenceEventType = hist
      ? hist.redo
        ? "redo"
        : "undo"
      : tr?.getMeta("uiEvent") === "paste"
        ? "paste"
        : action.type ||
          (delta.deleteCount
            ? delta.insert
              ? "replace"
              : "delete"
            : delta.insert
              ? "insert"
              : "format");
    live.current.doc = after;
    if (live.current.pick && !textOf(after).includes(live.current.pick.text)) {
      live.current.pick = null;
      setError("선택했던 대목이 바뀌었습니다. 제출 전에 다시 골라주세요.");
    }
    collector.current?.record(type, {
      source:
        type === "paste"
          ? "paste"
          : hist
            ? "editor_command"
            : source || action.source,
      position: delta.from,
      insertedChars: delta.insert.length,
      deletedChars: delta.deleteCount,
      payload: { steps, delta },
    });
    pending.current = { source: "unknown" };
    if (
      type === "paste" ||
      ["table_change", "image_insert", "paragraph_move"].includes(type)
    )
      checkpoint();
  }
  function checkpoint() {
    const current = live.current;
    if (
      !collector.current ||
      !editorRef.current ||
      composing.current ||
      current.status === "submitted"
    )
      return;
    const last = current.snapshots.at(-1);
    const doc = editorRef.current.getJSON();
    if (last && JSON.stringify(last.doc) === JSON.stringify(doc)) return;
    const event = collector.current.record("snapshot");
    const text = textOf(doc);
    current.snapshots.push({
      id: crypto.randomUUID(),
      submissionId: current.id,
      seq: event.seq,
      at: event.at,
      doc,
      text,
      charCount: text.length,
      wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
    });
    checkpointSeq.current = event.seq;
    checkpointAt.current = Date.now();
  }
  async function persistLocal() {
    if (live.current.status === "submitted") return;
    const samples = collector.current?.drainRhythm() || [];
    if (live.current.rhythmOptIn)
      live.current.rhythm.push(
        ...samples.slice(0, Math.max(0, 10000 - live.current.rhythm.length)),
      );
    await saveLocal(submission.id, {
      submission: structuredClone(live.current),
      ackSeq: ack.current,
      revision: revision.current,
      rhythmAck: rhythmAck.current,
      savedAt: Date.now(),
    });
  }
  async function persistLocalSafely() {
    try {
      await persistLocal();
      setLocalWarning("");
    } catch {
      setLocalWarning(
        "이 기기에 복구본을 저장하지 못했습니다. 서버 저장은 계속 시도합니다. 글 백업도 보관해주세요.",
      );
    }
  }
  async function sync(submit = false): Promise<boolean> {
    while (inFlight.current) await inFlight.current;
    if (live.current.status === "submitted") return true;
    if (composing.current) {
      if (submit) setError("한글 입력을 마친 뒤 다시 제출해주세요.");
      return false;
    }
    if (!submit && dirty.current === saved.current) return true;
    const task = (async () => {
      try {
        if (submit) {
          checkpoint();
          if (live.current.events.at(-1)?.type !== "submit")
            collector.current?.record("submit");
        } else if (
          Date.now() - checkpointAt.current > 45000 ||
          (live.current.events.at(-1)?.seq || 0) - checkpointSeq.current >= 50
        )
          checkpoint();
        await persistLocalSafely();
        const copy = structuredClone(live.current);
        const dirtyVersion = dirty.current;
        const pendingEvents = copy.events.filter((e) => e.seq > ack.current);
        let response:
          | { ackSeq: number; revision: number; status: "draft" | "submitted" }
          | undefined;
        do {
          const batch = pendingEvents.splice(0, 500);
          const batchEnd = batch.at(-1)?.seq || ack.current;
          const final = pendingEvents.length === 0;
          const request: SyncBody = {
            baseRevision: revision.current,
            events: batch,
            snapshots: copy.snapshots.filter(
              (s) => s.seq > ack.current && s.seq <= batchEnd,
            ),
            rhythm: final
              ? copy.rhythm.slice(rhythmAck.current).slice(-10000)
              : [],
            rhythmOptIn: copy.rhythmOptIn,
            title: copy.title,
            sources: copy.sources,
            pick: final ? copy.pick : null,
            reflections: copy.reflections,
            submit: submit && final,
          };
          setMessage("저장 중…");
          response = await api<{
            ackSeq: number;
            revision: number;
            status: "draft" | "submitted";
          }>(`/api/submissions/${submission.id}/sync`, request);
          ack.current = response.ackSeq;
          revision.current = response.revision;
          live.current.revision = response.revision;
        } while (pendingEvents.length);

        ack.current = response.ackSeq;
        revision.current = response.revision;
        live.current.revision = response.revision;
        rhythmAck.current = copy.rhythm.length;
        saved.current = dirtyVersion;
        setMessage("모든 변경사항 저장됨");
        setError("");
        if (response.status === "submitted") {
          live.current.status = "submitted";
          setSubmitted(true);
          editorRef.current?.setEditable(false);
          await removeLocal(submission.id).catch(() =>
            setLocalWarning(
              "제출은 완료했지만 이 기기의 복구본을 지우지 못했습니다. 공용 기기에서는 사이트 데이터를 지워주세요.",
            ),
          );
        } else await persistLocalSafely();
        return true;
      } catch (e) {
        setMessage("서버 저장 실패 · 백업을 확인해주세요");
        setError(
          e instanceof ApiError
            ? e.message
            : "서버에 연결하지 못했습니다. 이 기기에 저장한 글은 연결 후 다시 저장됩니다.",
        );
        return false;
      }
    })();
    inFlight.current = task;
    try {
      return await task;
    } finally {
      inFlight.current = null;
    }
  }
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const persistRef = useRef(persistLocalSafely);
  persistRef.current = persistLocalSafely;
  useEffect(() => {
    if (!editor || submitted) return;
    collector.current = new EvidenceCollector(
      submission.id,
      crypto.randomUUID(),
      (event) => {
        const previous = live.current.events.at(-1);
        event.at = Math.max(event.at, previous?.at || 0);
        live.current.events.push(event);
        bump();
      },
      live.current.events.at(-1)?.seq || 0,
    );
    collector.current.record("session_start");
    checkpoint();
    const detach = collector.current.attachDocumentSignals();
    const timer = setInterval(() => void syncRef.current(), 4000);
    const localTimer = setInterval(() => {
      if (dirty.current !== saved.current && !composing.current)
        persistRef.current().catch(() => {
          setError(
            "이 기기의 저장 공간을 사용할 수 없습니다. 서버 저장 상태를 확인하고 글을 백업해주세요.",
          );
        });
    }, 1000);
    const online = () => void syncRef.current();
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty.current !== saved.current) {
        e.preventDefault();
      }
    };
    const visibility = () => {
      if (document.hidden) {
        checkpoint();
        void persistRef.current();
        void syncRef.current();
      }
    };
    const pagehide = () => {
      collector.current?.record("session_end");
      void persistRef.current();
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", unload);
    window.addEventListener("pagehide", pagehide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      clearInterval(localTimer);
      detach();
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("pagehide", pagehide);
      document.removeEventListener("visibilitychange", visibility);
      collector.current?.resetRhythm();
      collector.current = null;
    };
    // A submitted document ends collection immediately. Metadata changes must not restart sessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, submitted]);
  const command = (fn: () => void, type: EvidenceEventType = "format") => {
    const separate = type !== "undo" && type !== "redo";
    if (editor && separate) editor.view.dispatch(closeHistory(editor.state.tr));
    pending.current = { type, source: "editor_command" };
    fn();
    if (editor && separate) editor.view.dispatch(closeHistory(editor.state.tr));
    pending.current = { source: "unknown" };
  };
  const choosePick = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, "\n", "\uFFFC").trim();
    if (!text || text.length > 1500) {
      setError("본문에서 1~1,500자의 문장 또는 문단을 먼저 선택해주세요.");
      return;
    }
    live.current.pick = { text, from, to, why: "" };
    setError("");
    bump();
  };
  const indent = (change: number) => {
    if (!editor) return;
    const type = editor.isActive("heading") ? "heading" : "paragraph";
    command(() =>
      editor
        .chain()
        .focus()
        .updateAttributes(type, {
          indent: Math.max(
            0,
            Math.min(5, (editor.getAttributes(type).indent || 0) + change),
          ),
        })
        .run(),
    );
  };
  const move = (direction: number) => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    const index = $from.index(0),
      target = index + direction;
    if (target < 0 || target >= editor.state.doc.childCount) return;
    const nodes = Array.from({ length: editor.state.doc.childCount }, (_, i) =>
      editor.state.doc.child(i),
    );
    let start = 0;
    for (let i = 0; i < Math.min(index, target); i++)
      start += nodes[i].nodeSize;
    const a = nodes[Math.min(index, target)],
      b = nodes[Math.max(index, target)];
    command(() => {
      const tr = editor.state.tr.replaceWith(
        start,
        start + a.nodeSize + b.nodeSize,
        [b, a],
      );
      editor.view.dispatch(tr);
      editor.commands.focus();
    }, "paragraph_move");
  };
  const findNext = () => {
    if (!editor || !find) return;
    const matches: { from: number; to: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        let index = node.text.indexOf(find);
        while (index !== -1) {
          matches.push({ from: pos + index, to: pos + index + find.length });
          index = node.text.indexOf(find, index + 1);
        }
      }
    });
    const match =
      matches.find((m) => m.from >= editor.state.selection.to) || matches[0];
    if (match) {
      editor.chain().focus().setTextSelection(match).scrollIntoView().run();
      setFindMessage(`${matches.length}곳 찾음`);
    } else setFindMessage("찾는 내용이 없습니다.");
  };
  const s = live.current;
  void version;
  if (submitted)
    return (
      <>
        <Header />
        <main className="submission-done">
          <span className="success-icon">
            <Check />
          </span>
          <p className="overline">YOUR THOUGHTS ARE ON THEIR WAY</p>
          <h1>생각과 과정을 함께 전했어요.</h1>
          <p className="muted">
            {assignment.title} · {s.alias}
          </p>
          <div className="done-meta">
            <span>✓ 작성 기록 저장</span>
            <span>✓ 선생님께 보여드릴 대목</span>
            <span>✓ 제출 완료</span>
          </div>
          {localWarning && <Notice error>{localWarning}</Notice>}
          <LearningFeedback submission={s} />
          <button
            onClick={() =>
              download(
                `${s.title || "나의 글"}.txt`,
                `${s.title}\n\n${textOf(s.doc)}\n\n참고자료\n${s.sources}`,
              )
            }
          >
            <Download size={16} />내 글 내려받기
          </button>
          <div className="panel text-left">
            <h2>{s.title}</h2>
            <RichDocument doc={s.doc} />
          </div>
          <p className="fine-print">
            선생님의 반응은 이 페이지를 다시 열거나 새로고침하면 확인할 수
            있어요.
          </p>
        </main>
      </>
    );
  return (
    <div className="writer">
      <header className="writer-header">
        <Brand />
        <div className="writer-assignment">
          <span>{assignment.title}</span>
          <small>{s.alias}</small>
        </div>
        <div className="writer-status">
          <span className="live-dot" />
          {message}
        </div>
        <button
          className="primary"
          disabled={submitting}
          onClick={() => {
            checkpoint();
            setReviewOpen(true);
          }}
        >
          제출 준비 <ArrowUp size={15} />
        </button>
      </header>
      <div className="writer-bar">
        <span>작성 공간</span>
        <span className="policy-inline">
          <b>{assignment.policy}</b> {POLICIES[assignment.policy]}
        </span>
        <button
          className="subtle"
          onClick={() => {
            checkpoint();
            void sync();
          }}
        >
          <Save size={15} />
          지금 저장
        </button>
      </div>
      {localWarning && (
        <div className="writer-error">
          <Notice error>{localWarning}</Notice>
        </div>
      )}
      {error && (
        <div className="writer-error">
          <Notice error>{error}</Notice>
          <button onClick={() => void sync()}>저장 다시 시도</button>
          <button
            onClick={() =>
              download(
                "proofwrite-backup.json",
                JSON.stringify(s),
                "application/json",
              )
            }
          >
            글 백업
          </button>
        </div>
      )}
      <div className="writing-layout">
        <main className="editor-column">
          <div className="toolbar" role="toolbar" aria-label="글 편집 도구">
            <div className="tool-group">
              <button
                title="실행 취소"
                aria-label="실행 취소"
                onClick={() =>
                  command(() => editor?.chain().focus().undo().run(), "undo")
                }
              >
                <Undo2 size={17} />
              </button>
              <button
                title="다시 실행"
                aria-label="다시 실행"
                onClick={() =>
                  command(() => editor?.chain().focus().redo().run(), "redo")
                }
              >
                <Redo2 size={17} />
              </button>
            </div>
            <select
              aria-label="글자 크기"
              defaultValue="16px"
              onChange={(e) =>
                command(() =>
                  editor
                    ?.chain()
                    .focus()
                    .setMark("textStyle", { fontSize: e.target.value })
                    .run(),
                )
              }
            >
              {[12, 14, 16, 18, 20, 24, 28, 32].map((n) => (
                <option key={n} value={`${n}px`}>
                  {n}px
                </option>
              ))}
            </select>
            <div className="tool-group">
              {[
                {
                  title: "굵게",
                  Icon: Bold,
                  active: "bold",
                  run: () => editor?.chain().focus().toggleBold().run(),
                },
                {
                  title: "기울임",
                  Icon: Italic,
                  active: "italic",
                  run: () => editor?.chain().focus().toggleItalic().run(),
                },
                {
                  title: "밑줄",
                  Icon: Underline,
                  active: "underline",
                  run: () => editor?.chain().focus().toggleUnderline().run(),
                },
              ].map(({ title, Icon, active, run }) => (
                <button
                  key={title}
                  aria-label={title}
                  title={title}
                  aria-pressed={editor?.isActive(active) || false}
                  onClick={() => command(run)}
                >
                  <Icon size={17} />
                </button>
              ))}
            </div>
            <div className="tool-group">
              {[
                { align: "left", name: "왼쪽 정렬", Icon: AlignLeft },
                { align: "center", name: "가운데 정렬", Icon: AlignCenter },
                { align: "right", name: "오른쪽 정렬", Icon: AlignRight },
              ].map(({ align, name, Icon }) => (
                <button
                  key={align}
                  title={name}
                  aria-label={name}
                  onClick={() =>
                    command(() =>
                      editor?.chain().focus().setTextAlign(align).run(),
                    )
                  }
                >
                  <Icon size={17} />
                </button>
              ))}
            </div>
            <div className="tool-group">
              <button
                title="글머리 기호"
                aria-label="글머리 기호"
                onClick={() =>
                  command(() =>
                    editor?.chain().focus().toggleBulletList().run(),
                  )
                }
              >
                <List size={17} />
              </button>
              <button
                title="번호 목록"
                aria-label="번호 목록"
                onClick={() =>
                  command(() =>
                    editor?.chain().focus().toggleOrderedList().run(),
                  )
                }
              >
                <ListOrdered size={17} />
              </button>
              <button
                title="들여쓰기"
                aria-label="들여쓰기"
                onClick={() => indent(1)}
              >
                <IndentIncrease size={17} />
              </button>
              <button
                title="내어쓰기"
                aria-label="내어쓰기"
                onClick={() => indent(-1)}
              >
                <IndentDecrease size={17} />
              </button>
            </div>
            <div className="tool-group">
              <button
                title="인용문"
                aria-label="인용문"
                onClick={() =>
                  command(() =>
                    editor?.chain().focus().toggleBlockquote().run(),
                  )
                }
              >
                <Quote size={17} />
              </button>
              <button
                title="표 삽입"
                aria-label="표 삽입"
                onClick={() =>
                  command(
                    () =>
                      editor
                        ?.chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run(),
                    "table_change",
                  )
                }
              >
                <Table size={17} />
              </button>
              <button
                title="이미지 삽입"
                aria-label="이미지 삽입"
                onClick={() => imageInput.current?.click()}
              >
                <ImageIcon size={17} />
              </button>
              <button
                title="링크 삽입"
                aria-label="링크 삽입"
                onClick={() => setLinkOpen(!linkOpen)}
              >
                <LinkIcon size={17} />
              </button>
            </div>
            <div className="tool-group">
              <button
                aria-label="문단 위로"
                title="문단 위로"
                onClick={() => move(-1)}
              >
                <ArrowUp size={17} />
              </button>
              <button
                aria-label="문단 아래로"
                title="문단 아래로"
                onClick={() => move(1)}
              >
                <ArrowDown size={17} />
              </button>
            </div>
          </div>
          {editor?.isActive("table") && (
            <div className="context-tools">
              <button
                onClick={() =>
                  command(
                    () => editor.chain().focus().addRowAfter().run(),
                    "table_change",
                  )
                }
              >
                행 추가
              </button>
              <button
                onClick={() =>
                  command(
                    () => editor.chain().focus().addColumnAfter().run(),
                    "table_change",
                  )
                }
              >
                열 추가
              </button>
              <button
                onClick={() =>
                  command(
                    () => editor.chain().focus().deleteRow().run(),
                    "table_change",
                  )
                }
              >
                행 삭제
              </button>
              <button
                onClick={() =>
                  command(
                    () => editor.chain().focus().deleteColumn().run(),
                    "table_change",
                  )
                }
              >
                열 삭제
              </button>
              <button
                onClick={() =>
                  command(
                    () => editor.chain().focus().deleteTable().run(),
                    "table_change",
                  )
                }
              >
                표 삭제
              </button>
            </div>
          )}
          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (
                !["image/png", "image/jpeg", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 250000
              ) {
                setError("250KB 이하의 PNG·JPEG·WebP 이미지를 선택해주세요.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () =>
                command(
                  () =>
                    editor
                      ?.chain()
                      .focus()
                      .setImage({ src: String(reader.result), alt: file.name })
                      .run(),
                  "image_insert",
                );
              reader.readAsDataURL(file);
            }}
          />
          {linkOpen && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^https?:\/\//i.test(url)) {
                  setError(
                    "https:// 또는 http://로 시작하는 주소를 입력해주세요.",
                  );
                  return;
                }
                command(
                  () =>
                    editor
                      ?.chain()
                      .focus()
                      .extendMarkRange("link")
                      .setLink({ href: url })
                      .run(),
                  "link_insert",
                );
                setLinkOpen(false);
                setUrl("");
              }}
            >
              <input
                aria-label="링크 주소"
                placeholder="https://… (링크를 넣을 글을 먼저 선택)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button>적용</button>
              <button
                type="button"
                onClick={() => {
                  command(
                    () => editor?.chain().focus().unsetLink().run(),
                    "link_insert",
                  );
                  setLinkOpen(false);
                }}
              >
                링크 해제
              </button>
            </form>
          )}
          <div className="find-bar">
            <Search size={15} />
            <input
              aria-label="본문에서 찾기"
              placeholder="본문에서 찾기"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") findNext();
              }}
            />
            <button className="subtle" onClick={findNext}>
              다음 찾기
            </button>
            <small role="status">{findMessage}</small>
          </div>
          <article className="writing-paper">
            <input
              className="document-title"
              aria-label="글 제목"
              placeholder="나의 생각에 제목을 붙여주세요"
              value={s.title}
              maxLength={160}
              onChange={(e) => {
                s.title = e.target.value;
                bump();
              }}
            />
            <div className="document-byline">
              {s.alias} <span>·</span> 생각을 자유롭게 펼쳐보세요.
            </div>
            <EditorContent editor={editor} />
          </article>
          <div className="document-footer">
            <span>
              {textOf(s.doc).length.toLocaleString()}자 · {s.snapshots.length}개
              버전
            </span>
            <button
              className="subtle"
              onClick={() =>
                download(`${s.title || "나의 글"}.txt`, textOf(s.doc))
              }
            >
              <Download size={14} />글 내려받기
            </button>
          </div>
        </main>
        <aside className="writing-aside">
          <LearningFocus assignment={assignment} />
          <div className="aside-card">
            <span className="overline">THOUGHT TRACE</span>
            <h3>생각이 남고 있어요.</h3>
            <p>
              완벽한 첫 문장보다
              <br />
              나만의 생각을 차근차근.
            </p>
            <ul className="check-list">
              <li>
                <Check size={16} />
                작성과 수정 기록
              </li>
              <li>
                <Check size={16} />
                자료를 다듬은 과정
              </li>
              <li>
                <Check size={16} />
                주요 시점의 문서 버전
              </li>
            </ul>
            <small>점수보다 여러분의 이야기가 중요해요.</small>
          </div>
          <div className="aside-card pick-card">
            <Star size={20} />
            <h3>선생님, 여기를 읽어주세요.</h3>
            <p>본문에서 문장이나 문단을 선택한 뒤 아래 버튼을 눌러주세요.</p>
            <button className="outline wide" onClick={choosePick}>
              선택한 대목 담기
            </button>
            {s.pick && (
              <>
                <blockquote>{s.pick.text}</blockquote>
                <label>
                  이 대목을 고른 이유 <small>(선택)</small>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={s.pick.why}
                    onChange={(e) => {
                      s.pick!.why = e.target.value;
                      bump();
                    }}
                  />
                </label>
              </>
            )}
          </div>
          <div className="aside-card">
            <label>
              참고자료 · 출처
              <textarea
                rows={3}
                placeholder="자료명·주소, 가져온 부분, 내 생각을 구분해 적어주세요. 허용된 AI 도움도 무엇에 썼는지 남겨주세요."
                maxLength={6000}
                value={s.sources}
                onChange={(e) => {
                  s.sources = e.target.value;
                  bump();
                }}
              />
            </label>
          </div>
          <details className="aside-card">
            <summary>작성 리듬 연구 설정</summary>
            <p>
              선택 참여입니다. 현재 과제 안에서 입력 간격만 연구합니다. 한글
              조합 중에는 측정을 제외하며, 신원 판별에는 사용하지 않습니다.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={s.rhythmOptIn}
                onChange={(e) => {
                  s.rhythmOptIn = e.target.checked;
                  if (!s.rhythmOptIn) {
                    s.rhythm = [];
                    rhythmAck.current = 0;
                    collector.current?.drainRhythm();
                  }
                  bump();
                }}
              />
              현재 과제 리듬 연구에 참여
            </label>
          </details>
        </aside>
      </div>
      {reviewOpen && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
          >
            <p className="overline">BEFORE YOU SEND</p>
            <h2 id="submit-title">생각을 한 번 돌아볼까요?</h2>
            <p className="muted">
              제출하면 작성이 마무리되고 선생님께 전달됩니다.
            </p>
            <details className="learning-focus">
              <summary>보내기 전, 독자의 눈으로 한 번 읽기</summary>
              <ul>
                <li>내가 전하려는 생각을 독자가 찾을 수 있나요?</li>
                <li>그 생각을 이해할 구체적인 근거나 장면이 있나요?</li>
                <li>자료에서 가져온 말과 내 생각을 구분했나요?</li>
                <li>과제에서 함께 보기로 한 기준에 맞나요?</li>
              </ul>
              <p>
                지금 고치고 싶은 곳이 있다면 ‘글로 돌아가기’를 눌러주세요. 답을
                적거나 모두 체크할 필요는 없어요.
              </p>
            </details>
            {!s.pick && (
              <Notice error>
                본문에서 선생님이 꼭 읽어주셨으면 하는 대목을 선택해주세요.
              </Notice>
            )}
            {s.pick && <blockquote>{s.pick.text}</blockquote>}
            {assignment.questions.map((question, i) => (
              <label key={i}>
                {question} <small>(선택)</small>
                <textarea
                  disabled={submitting}
                  rows={2}
                  maxLength={3000}
                  value={s.reflections[i] || ""}
                  onChange={(e) => {
                    s.reflections[i] = e.target.value;
                    bump();
                  }}
                />
              </label>
            ))}
            {error && <Notice error>{error}</Notice>}
            <div className="modal-actions">
              <button
                disabled={submitting}
                onClick={() => setReviewOpen(false)}
              >
                글로 돌아가기
              </button>
              <button
                className="primary"
                disabled={
                  submitting ||
                  !s.pick ||
                  !s.title.trim() ||
                  !textOf(s.doc).trim()
                }
                onClick={async () => {
                  setSubmitting(true);
                  editor?.setEditable(false);
                  const ok = await sync(true);
                  if (!ok) editor?.setEditable(true);
                  setSubmitting(false);
                }}
              >
                {submitting ? "전달 중…" : "제출하기"} <Send size={16} />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
