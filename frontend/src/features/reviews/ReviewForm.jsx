import { useState } from 'react'
import { createReview } from '../../services/api/reviews.api'
import { Select, Textarea } from '../../components/common/Form'
import Button from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'

/** Eligibility (e.g. "must have a completed booking") is enforced by the backend; its error is shown as-is. */
export default function ReviewForm({ facilityId, onDone }) {
  const toast = useToast()
  const [rating, setRating] = useState('5')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try {
      await createReview(facilityId, { rating: Number(rating), comment: comment.trim() })
      toast.success('Thanks for your review!')
      setComment('')
      onDone?.()
    } catch (err) { setError(err) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl bg-mint/60 p-5">
      <h3 className="font-bold text-navy">Write a review</h3>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error.status === 403 ? 'You can review a venue after you have played there.' : error.message}</p>}
      <Select label="Rating" value={rating} onChange={(e) => setRating(e.target.value)} options={['5', '4', '3', '2', '1']} />
      <Textarea label="Comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
      <Button type="submit" loading={busy}>Submit review</Button>
    </form>
  )
}
