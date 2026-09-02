import { notFound, redirect } from "next/navigation";

export default async function CalendarTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  redirect(`/api/calendar?token=${encodeURIComponent(token)}`);
}
