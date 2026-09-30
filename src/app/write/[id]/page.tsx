import Writer from "../../../components/Writer";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Writer id={id} />;
}
