export type ProductType = 'pro_monthly' | 'pro_annual' | 'founding'

export async function createCheckout(
  productType: ProductType,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
  try {
    const response = await fetch(`${backendUrl}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productType, userId, userEmail })
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Checkout failed' }
    }

    const { checkout_url } = await response.json()
    return { success: true, url: checkout_url }

  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
