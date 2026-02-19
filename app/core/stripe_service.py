import stripe
from typing import Optional
from fastapi import HTTPException, status
from app.config import get_settings

# Initialize Stripe with secret key from settings
settings = get_settings()
stripe.api_key = settings.stripe_secret_key


def create_payment_intent(
    amount: int,
    currency: str = "usd",
    metadata: Optional[dict] = None,
) -> stripe.PaymentIntent:
    """
    Create a Stripe PaymentIntent.

    Args:
        amount: Amount in cents (e.g., 1000 for $10.00)
        currency: Three-letter ISO currency code (default: "usd")
        metadata: Optional metadata to attach to the payment intent

    Returns:
        stripe.PaymentIntent: The created payment intent object

    Raises:
        HTTPException: If Stripe API returns an error
    """
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            metadata=metadata or {},
            # Automatic payment methods for better UX
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        )
        return payment_intent

    except stripe.error.CardError as e:
        # Card was declined or validation error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Card error: {e.user_message}",
        )
    except stripe.error.InvalidRequestError as e:
        # Invalid parameters
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}",
        )
    except stripe.error.AuthenticationError as e:
        # Authentication with Stripe API failed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment service authentication failed",
        )
    except stripe.error.APIConnectionError as e:
        # Network communication failed
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service unavailable",
        )
    except stripe.error.StripeError as e:
        # Generic Stripe error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment error: {str(e)}",
        )
    except Exception as e:
        # Something else went wrong
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


def get_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    """
    Retrieve a Stripe PaymentIntent by ID.

    Args:
        payment_intent_id: The Stripe PaymentIntent ID (e.g., "pi_...")

    Returns:
        stripe.PaymentIntent: The payment intent object

    Raises:
        HTTPException: If Stripe API returns an error or payment intent not found
    """
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return payment_intent

    except stripe.error.InvalidRequestError as e:
        # Payment intent not found or invalid ID
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment intent not found: {str(e)}",
        )
    except stripe.error.AuthenticationError as e:
        # Authentication with Stripe API failed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment service authentication failed",
        )
    except stripe.error.APIConnectionError as e:
        # Network communication failed
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service unavailable",
        )
    except stripe.error.StripeError as e:
        # Generic Stripe error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment error: {str(e)}",
        )
    except Exception as e:
        # Something else went wrong
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


def confirm_payment_intent(
    payment_intent_id: str,
    payment_method: Optional[str] = None,
) -> stripe.PaymentIntent:
    """
    Confirm a Stripe PaymentIntent.

    Args:
        payment_intent_id: The Stripe PaymentIntent ID
        payment_method: Optional payment method ID to attach

    Returns:
        stripe.PaymentIntent: The confirmed payment intent object

    Raises:
        HTTPException: If Stripe API returns an error
    """
    try:
        params = {}
        if payment_method:
            params["payment_method"] = payment_method

        payment_intent = stripe.PaymentIntent.confirm(
            payment_intent_id,
            **params,
        )
        return payment_intent

    except stripe.error.CardError as e:
        # Card was declined
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Card error: {e.user_message}",
        )
    except stripe.error.InvalidRequestError as e:
        # Payment intent not found or invalid parameters
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}",
        )
    except stripe.error.AuthenticationError as e:
        # Authentication with Stripe API failed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment service authentication failed",
        )
    except stripe.error.APIConnectionError as e:
        # Network communication failed
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service unavailable",
        )
    except stripe.error.StripeError as e:
        # Generic Stripe error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment error: {str(e)}",
        )
    except Exception as e:
        # Something else went wrong
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


def cancel_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    """
    Cancel a Stripe PaymentIntent.

    Args:
        payment_intent_id: The Stripe PaymentIntent ID

    Returns:
        stripe.PaymentIntent: The canceled payment intent object

    Raises:
        HTTPException: If Stripe API returns an error
    """
    try:
        payment_intent = stripe.PaymentIntent.cancel(payment_intent_id)
        return payment_intent

    except stripe.error.InvalidRequestError as e:
        # Payment intent not found or cannot be canceled
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel payment: {str(e)}",
        )
    except stripe.error.AuthenticationError as e:
        # Authentication with Stripe API failed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment service authentication failed",
        )
    except stripe.error.APIConnectionError as e:
        # Network communication failed
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service unavailable",
        )
    except stripe.error.StripeError as e:
        # Generic Stripe error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment error: {str(e)}",
        )
    except Exception as e:
        # Something else went wrong
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )
