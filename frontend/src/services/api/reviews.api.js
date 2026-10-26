import client from './client'
import { ENDPOINTS } from '../../config/endpoints'

export async function createReview(facilityId, { rating, comment }) {
  const { data } = await client.post(ENDPOINTS.facilities.reviews(facilityId), { rating, comment })
  return data
}
