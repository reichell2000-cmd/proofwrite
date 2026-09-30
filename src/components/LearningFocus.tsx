import type { Assignment } from "../core/model";
export function LearningFocus({
  assignment,
}: {
  assignment: Pick<Assignment, "learningGoal" | "successCriteria">;
}) {
  if (!assignment.learningGoal && !assignment.successCriteria?.length)
    return null;
  return (
    <section className="learning-focus">
      <h3>이번 글에서 배울 것</h3>
      {assignment.learningGoal && (
        <p className="pre-wrap">{assignment.learningGoal}</p>
      )}
      {!!assignment.successCriteria?.length && (
        <>
          <b>함께 살펴볼 기준</b>
          <ul>
            {assignment.successCriteria.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <small>
        글의 내용을 함께 읽기 위한 기준입니다. 입력 속도나 수정 횟수로 평가하지
        않아요.
      </small>
    </section>
  );
}
