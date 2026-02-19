from fastapi import APIRouter
from app.core.stripe_service import create_payment_intent

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Service is running"}


@router.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to FastAPI", "docs": "/docs"}


@router.post("/test-stripe")
async def test_stripe():
    """
    Test Stripe connection by creating a test payment intent for $10.

    Returns the payment_intent_id and client_secret for testing purposes.
    """
    # Create a test payment intent for $10.00 (1000 cents)
    payment_intent = create_payment_intent(
        amount=1000,
        currency="usd",
        metadata={
            "test": "true",
            "description": "Test payment intent",
        }
    )

    return {
        "payment_intent_id": payment_intent.id,
        "client_secret": payment_intent.client_secret,
        "amount": payment_intent.amount,
        "currency": payment_intent.currency,
        "status": payment_intent.status,
    }
