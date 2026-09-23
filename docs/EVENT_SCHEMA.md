# Evidence events and snapshots

`EvidenceEvent`: id, submissionId, sessionId, global monotonically increasing seq, at (client wall time), type, source, optional text position/counts/payload. New sessions resume sequence from the latest event; they never restart at 1.

Document events contain `payload.steps` (ProseMirror JSON steps) and `payload.delta` (`from`, `deleteCount`, `insert`) for canonical text. Source is keyboard / composition / paste / editor_command / unknown. An undo-restored character is not relabeled as direct keyboard input. Counts are observed insertion/deletion counts, not a human contribution rate.

Events: session_start/end, insert/delete/replace, paste/cut, undo/redo, paragraph_move, format, focus/blur, visibility_hidden/visible, snapshot/submit, table_change, image_insert, link_insert. Text edits inside tables replay as normal document edits; explicit row/column commands emit table_change.

Snapshots contain canonical JSON, plain text, sequence, timestamp and derived counts. Checkpoints are replay anchors. Each snapshot is validated against the server-replayed document at that exact event sequence. Title, references, reflection answers and student choice are submission metadata; v0.1 does not replay the history of those metadata fields.

Paste provenance tracks text-position mutations (UTF-16). Replacement overlapping paste records subsequent inserted characters and final retained origins. Undo/redo restore recent provenance states where available. Paragraph moves or unavailable old undo states mark the result approximate. It does not measure semantic originality. Internal copy/paste is still a clipboard insertion; it must not be called AI-generated or misconduct.

Privacy: the document delta necessarily contains written/deleted text for replay. The separate rhythm stream stores timing-derived numeric features only. Recording disclosure explains that earlier/deleted text remains visible to the teacher. Editor-only key handlers exclude IME composition; no global key listener exists.

동일한 문장을 선택 영역에 다시 붙여넣어 결과 문자열이 같아도, 단일 replacement step의 실제 범위를 사용해 붙여넣기/교체량을 기록합니다. 여러 구조 변경이 섞이면 재구성 가능한 전체 문자 차이를 사용합니다.
