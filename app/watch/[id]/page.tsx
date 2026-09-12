import Audience from "@/components/cutline/audience";
export default async function Watch({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Audience id={(await params).id.toUpperCase()} />;
}
