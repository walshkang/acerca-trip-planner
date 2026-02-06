import { redirect } from 'next/navigation'

export default function PlaceDetailPageRedirect({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/?place=${encodeURIComponent(params.id)}`)
}

