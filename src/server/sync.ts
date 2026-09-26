import { Node } from "@tiptap/pm/model";
import { schema } from "../core/editor/extensions";
import { applyEvent, eventTextDelta, textOf } from "../core/evidence/replay";
import { type Submission, type SyncBody, hasEffort } from "../core/model";
import { HttpError } from "./store";
export function validateDoc(doc: Record<string, unknown>) {
  const node = Node.fromJSON(schema, doc);
  node.check();
  if (node.content.size > 55000)
    throw new HttpError(413, "문서의 최대 길이는 약 5만 자입니다.");
  node.descendants((n) => {
    if (
      n.type.name === "image" &&
      !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(
        n.attrs.src || "",
      )
    )
      throw new HttpError(400, "이미지는 업로드한 PNG·JPEG·WebP만 허용합니다.");
    for (const mark of n.marks) {
      if (
        mark.type.name === "link" &&
        !/^https?:\/\//i.test(mark.attrs.href || "")
      )
        throw new HttpError(400, "링크는 http 또는 https 주소만 허용합니다.");
      if (
        mark.type.name === "textStyle" &&
        mark.attrs.fontSize &&
        !/^(12|14|16|18|20|24|28|32)px$/.test(mark.attrs.fontSize)
      )
        throw new HttpError(400, "지원하지 않는 글자 크기입니다.");
    }
  });
}
export function mergeSubmission(
  current: Submission,
  request: SyncBody,
): Submission {
  if (current.status === "submitted") {
    if (
      request.submit &&
      request.events.every((e) =>
        current.events.some((old) => old.id === e.id && old.seq === e.seq),
      )
    )
      return current;
    throw new HttpError(409, "이미 제출된 문서입니다.");
  }
  const known = new Map(current.events.map((e) => [e.seq, e]));
  const fresh = request.events.filter((e) => !known.has(e.seq));
  for (const e of request.events) {
    const old = known.get(e.seq);
    if (old && JSON.stringify(old) !== JSON.stringify(e))
      throw new HttpError(
        409,
        "다른 탭에서 변경되었습니다. 현재 글을 복사해 보관한 뒤 새로고침해주세요.",
      );
  }
  if (request.baseRevision !== current.revision) {
    // Lost response retry: accept only a byte-equivalent committed batch; metadata-only edits still conflict.
    if (
      request.events.length > 0 &&
      !fresh.length &&
      request.title === current.title &&
      request.sources === current.sources &&
      (request.effort === undefined ||
        JSON.stringify(request.effort) === JSON.stringify(current.effort)) &&
      JSON.stringify(request.pick) === JSON.stringify(current.pick) &&
      JSON.stringify(request.reflections) ===
        JSON.stringify(current.reflections) &&
      request.rhythmOptIn === current.rhythmOptIn
    )
      return current;
    throw new HttpError(
      409,
      "다른 탭의 변경과 충돌했습니다. 현재 글을 복사해 보관한 뒤 새로고침해주세요.",
    );
  }
  let doc = current.doc;
  let seq = current.events.at(-1)?.seq || 0;
  let lastAt = current.events.at(-1)?.at || 0;
  const states = new Map<number, Record<string, unknown>>();
  const ids = new Set(current.events.map((e) => e.id));
  for (const e of fresh) {
    if (ids.has(e.id))
      throw new HttpError(400, "중복된 작성 기록 식별자입니다.");
    ids.add(e.id);
    if (e.seq !== ++seq || e.submissionId !== current.id)
      throw new HttpError(400, "작성 기록 순서가 맞지 않습니다.");
    if (e.at < lastAt || e.at > Date.now() + 300000)
      throw new HttpError(400, "작성 기록의 시간을 확인해주세요.");
    lastAt = e.at;
    const before = doc;
    try {
      doc = applyEvent(doc, e);
      validateDoc(doc);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, "문서 변경 기록을 확인해주세요.");
    }
    const delta = eventTextDelta(
      before,
      doc,
      Array.isArray(e.payload?.steps) ? e.payload.steps : [],
    );
    if (e.payload?.steps) {
      if (
        JSON.stringify(delta) !== JSON.stringify(e.payload.delta) ||
        e.insertedChars !== delta.insert.length ||
        e.deletedChars !== delta.deleteCount
      )
        throw new HttpError(400, "문서와 작성 기록이 일치하지 않습니다.");
    } else if (e.insertedChars || 0 || e.deletedChars || 0)
      throw new HttpError(400, "변경 내용 없는 문자수 기록입니다.");
    if (e.type === "snapshot") states.set(e.seq, doc);
  }
  if (current.events.length + fresh.length > 50000)
    throw new HttpError(413, "Pilot 과제 기록 한도에 도달했습니다.");
  const snapshots = [...current.snapshots];
  for (const s of request.snapshots) {
    if (snapshots.some((old) => old.seq === s.seq)) {
      continue;
    }
    const expected = states.get(s.seq);
    if (
      !expected ||
      s.submissionId !== current.id ||
      JSON.stringify(s.doc) !== JSON.stringify(expected) ||
      s.text !== textOf(expected)
    )
      throw new HttpError(400, "문서 버전이 작성 기록과 일치하지 않습니다.");
    snapshots.push({
      ...s,
      charCount: s.text.length,
      wordCount: s.text.trim() ? s.text.trim().split(/\s+/).length : 0,
    });
  }
  const text = textOf(doc);
  if (request.pick && !text.includes(request.pick.text))
    throw new HttpError(
      400,
      "선택 대목이 현재 글에서 바뀌었습니다. 다시 선택해주세요.",
    );
  if (
    request.submit &&
    (!request.title || !text.trim() || fresh.at(-1)?.type !== "submit")
  )
    throw new HttpError(400, "제목과 본문을 확인해주세요.");
  const effort = request.effort ?? current.effort;
  for (const file of effort?.attachments || []) {
    const prefix = `data:${file.mime};base64,`;
    if (
      !file.data.startsWith(prefix) ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(file.data.slice(prefix.length))
    )
      throw new HttpError(400, "첨부자료 형식을 확인해주세요.");
    const bytes = Buffer.from(file.data.slice(prefix.length), "base64");
    const signature =
      file.mime === "application/pdf"
        ? bytes.subarray(0, 5).toString() === "%PDF-"
        : file.mime === "image/png"
          ? bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
          : file.mime === "image/jpeg"
            ? bytes.subarray(0, 3).toString("hex") === "ffd8ff"
            : bytes.subarray(0, 4).toString() === "RIFF" &&
              bytes.subarray(8, 12).toString() === "WEBP";
    if (bytes.length !== file.size || bytes.length > 524288 || !signature)
      throw new HttpError(400, "첨부자료의 종류나 크기가 맞지 않습니다.");
  }
  if (request.submit && !hasEffort(effort))
    throw new HttpError(
      400,
      "노력의 증거에 해본 일 한 가지를 적거나 자료를 첨부해주세요.",
    );
  const next = {
    ...current,
    doc,
    events: [...current.events, ...fresh],
    snapshots,
    rhythm: request.rhythmOptIn
      ? [...current.rhythm, ...request.rhythm].slice(-10000)
      : [],
    rhythmOptIn: request.rhythmOptIn,
    title: request.title,
    sources: request.sources,
    effort,
    submittedAt: request.submit ? Date.now() : current.submittedAt,
    pick: request.pick,
    reflections: request.reflections,
    status: request.submit ? ("submitted" as const) : ("draft" as const),
    updatedAt: Date.now(),
    revision: current.revision + 1,
  };
  if (JSON.stringify(next).length > 24_000_000)
    throw new HttpError(413, "문서 저장 용량 한도에 도달했습니다.");
  return next;
}
