export interface CheckoutRequest {
  userId: string
  email?: string
  planType: string
  billingCycle: string
  amount: number
  currency: string
  successUrl: string
  cancelUrl: string
}

export interface CheckoutSession {
  provider: string
  providerSessionId: string
  checkoutUrl: string
}

export interface PaymentProviderAdapter {
  readonly id: string
  createCheckoutSession(input: CheckoutRequest): Promise<CheckoutSession>
}

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PaymentConfigurationError"
  }
}

/**
 * Provider-neutral registry. Add a PCI-compliant hosted-checkout adapter here
 * after the payment provider is selected. Card data must never pass through
 * OnPace or this API route.
 */
export function getPaymentProviderAdapter(
  _providerId: string
): PaymentProviderAdapter {
  throw new PaymentConfigurationError(
    "The payment provider has not been configured yet."
  )
}
