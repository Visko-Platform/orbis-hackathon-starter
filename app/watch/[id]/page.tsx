import Audience from "@/components/cutline/audience-client";
export default async function Watch({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Audience id={(await params).id.toUpperCase()} />;
}
