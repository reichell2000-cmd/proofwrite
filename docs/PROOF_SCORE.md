# Proof Score v0.1 — revised Pilot hypothesis

Purpose: expose the sufficiency of **recorded process evidence**, with dimensions and facts. Never authorship, AI-use, plagiarism or misconduct probability.

| Dimension          | Maximum | Observable input                                                         |
| ------------------ | ------: | ------------------------------------------------------------------------ |
| Thought Trace      |      30 | Checkpoints, document changes and sessions                               |
| My Proof           |      25 | Optional within-task rhythm prototype, if both windows have >=40 samples |
| Input Evidence     |      20 | Recorded inserted/deleted content                                        |
| Revision Evidence  |      15 | Revisions and larger rewrites                                            |
| Process Continuity |      10 | Checkpoints and estimated active intervals                               |

These are uncalibrated heuristics. Labels: >=80 과정증거 충분; >=55 확인 권장; otherwise 과정 확인 필요. They are not grades or scientifically validated cutoffs.

Corrections from the inherited foundation:

- An empty document/empty activity has zero points.
- Missing rhythm is `null` / 해당 없음, not an invented 12 points. Other dimensions sum to 75; the display explicitly states normalization to 100.
- Removed independent penalties for paste size and window exits.
- Round components before summing so the displayed arithmetic reconciles.

My Proof is an optional research prototype. It compares the median intervals in two windows of the current task; it cannot identify a student. IME, assistive devices, dictation, keyboard changes and fatigue require separate evaluation. Composition intervals are excluded. Research opt-out clears the current task's stored timing samples on the next successful save. Maximum retained timing samples: 10,000, with no key values.

The Student UI contains no numeric Proof Score. The Teacher UI always includes caveats, component values, factual reasons, student-picked text and reading acknowledgement. Full-text reading is an alternative if there are fewer distinct guide passages than the required count.

Calibration remains pending: consenting real students, accessibility/device/IME strata, short versus long tasks, legitimate citations, paste transformations, time effects and teacher usefulness. A high score can be manufactured; a low score can be normal. No automated academic sanctions.
