import Join from "../../../components/Join";
import { Header, Notice } from "../../../components/Shell";
import { read } from "../../../server/store";
import { equal } from "../../../server/auth";
import type { Assignment } from "../../../core/model";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { id } = await params;
  const { code } = await searchParams;
  let assignment: Assignment;
  try {
    assignment = await read<Assignment>("assignments", id);
    if (!code || !equal(code, assignment.joinCode)) throw new Error();
  } catch {
    return (
      <>
        <Header />
        <main className="narrow">
          <Notice error>
            참여 링크를 확인해주세요. 선생님이 보내주신 전체 링크가 필요합니다.
          </Notice>
        </main>
      </>
    );
  }
  const { joinCode, ...safe } = assignment;
  void joinCode;
  return <Join assignment={safe} code={code} />;
}
