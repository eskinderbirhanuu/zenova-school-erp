"""Payment gateway abstraction — provider-agnostic interface + factory.

All payment integration goes through this layer. Add new providers by
subclassing BasePaymentGateway and registering in PaymentGatewayFactory.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional, Any
from sqlalchemy.orm import Session


@dataclass
class PaymentInitResult:
    checkout_url: str
    gateway_reference: str
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class TransactionStatus:
    success: bool
    gateway_reference: str
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class WebhookResult:
    tx_ref: str
    status: str
    gateway_reference: str
    raw: dict[str, Any] = field(default_factory=dict)


class BasePaymentGateway(ABC):
    """Abstract payment gateway provider."""

    @abstractmethod
    def get_name(self) -> str:
        ...

    @abstractmethod
    def initialize_payment(
        self,
        amount: Decimal,
        currency: str,
        email: str,
        tx_ref: str,
        callback_url: str,
        return_url: str,
        first_name: str = "",
        last_name: str = "",
        description: str = "",
        phone_number: Optional[str] = None,
    ) -> PaymentInitResult:
        ...

    @abstractmethod
    def verify_transaction(self, tx_ref: str) -> TransactionStatus:
        ...

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        ...

    @abstractmethod
    def parse_webhook(self, payload: dict[str, Any]) -> WebhookResult:
        ...


class ChapaPaymentGateway(BasePaymentGateway):
    """Chapa implementation wrapping chapa_service module."""

    def __init__(self, db: Optional[Session] = None, school_id: Optional[str] = None):
        self.db = db
        self.school_id = school_id

    def get_name(self) -> str:
        return "chapa"

    def initialize_payment(
        self,
        amount: Decimal,
        currency: str,
        email: str,
        tx_ref: str,
        callback_url: str,
        return_url: str,
        first_name: str = "",
        last_name: str = "",
        description: str = "",
        phone_number: Optional[str] = None,
    ) -> PaymentInitResult:
        from app.services import chapa_service
        result = chapa_service.initialize_payment(
            amount=amount, currency=currency, email=email,
            first_name=first_name, last_name=last_name,
            tx_ref=tx_ref, callback_url=callback_url,
            return_url=return_url, description=description,
            phone_number=phone_number,
            db=self.db, school_id=self.school_id,
        )
        data = result.get("data", {})
        return PaymentInitResult(
            checkout_url=data.get("checkout_url", ""),
            gateway_reference=data.get("reference", ""),
            raw=result,
        )

    def verify_transaction(self, tx_ref: str) -> TransactionStatus:
        from app.services import chapa_service
        result = chapa_service.verify_transaction(tx_ref, db=self.db, school_id=self.school_id)
        data = result.get("data", {})
        return TransactionStatus(
            success=data.get("status") == "success",
            gateway_reference=data.get("reference", ""),
            raw=result,
        )

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        from app.services import chapa_service
        return chapa_service.verify_webhook_signature(
            payload, signature, db=self.db, school_id=self.school_id,
        )

    def parse_webhook(self, payload: dict[str, Any]) -> WebhookResult:
        return WebhookResult(
            tx_ref=payload.get("tx_ref", ""),
            status=payload.get("status", ""),
            gateway_reference=payload.get("reference", ""),
            raw=payload,
        )


class PaymentGatewayFactory:
    """Registry of available gateway providers."""

    _providers: dict[str, type[BasePaymentGateway]] = {}

    @classmethod
    def register(cls, name: str, provider_cls: type[BasePaymentGateway]) -> None:
        cls._providers[name] = provider_cls

    @classmethod
    def get_gateway(
        cls,
        gateway_name: str = "chapa",
        db: Optional[Session] = None,
        school_id: Optional[str] = None,
    ) -> BasePaymentGateway:
        provider_cls = cls._providers.get(gateway_name)
        if not provider_cls:
            raise ValueError(f"Unknown payment gateway: {gateway_name}")
        return provider_cls(db=db, school_id=school_id)

    @classmethod
    def get_gateway_from_session(
        cls,
        session: Any,
        db: Optional[Session] = None,
    ) -> BasePaymentGateway:
        gateway_name = getattr(session, "gateway", "chapa") or "chapa"
        return cls.get_gateway(gateway_name, db=db, school_id=getattr(session, "school_id", None))


PaymentGatewayFactory.register("chapa", ChapaPaymentGateway)
