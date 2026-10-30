import pytest
from core.common.contracts import (
    DocumentLifecycleState,
    CoreError,
    CoreException,
    CoreResult,
    GuidelineMetadata,
)
from core.common.base import BaseCore
from pydantic import BaseModel


class DummyInput(BaseModel):
    should_fail: bool = False
    fail_code: str = "SAMPLE_FAIL"
    retryable: bool = False


class DummySuccessCore(BaseCore):
    name = "dummy_core"
    version = "1.0.0"

    def _execute(self, input_data: DummyInput):
        if input_data.should_fail:
            raise CoreException(
                code=input_data.fail_code,
                message="Cố ý tạo lỗi để test",
                retryable=input_data.retryable,
            )
        return {"processed": True, "count": 42}


def test_core_result_success():
    core = DummySuccessCore()
    result = core.run(DummyInput(should_fail=False))

    assert result.ok is True
    assert result.data["processed"] is True
    assert result.data["count"] == 42
    assert result.error is None
    assert result.meta["core_name"] == "dummy_core"
    assert result.meta["core_version"] == "1.0.0"
    assert "elapsed_ms" in result.meta


def test_core_result_expected_error():
    core = DummySuccessCore()
    result = core.run(DummyInput(should_fail=True, fail_code="INVALID_DATA", retryable=True))

    assert result.ok is False
    assert result.data is None
    assert result.error is not None
    assert result.error.code == "INVALID_DATA"
    assert result.error.retryable is True
    assert result.error.step == "dummy_core"


def test_lifecycle_states():
    # Kiểm tra các state trong state machine
    assert DocumentLifecycleState.DISCOVERED == "DISCOVERED"
    assert DocumentLifecycleState.FETCHED == "FETCHED"
    assert DocumentLifecycleState.EXTRACTED == "EXTRACTED"
    assert DocumentLifecycleState.ANALYZED == "ANALYZED"
    assert DocumentLifecycleState.VERIFIED == "VERIFIED"
    assert DocumentLifecycleState.PENDING_REVIEW == "PENDING_REVIEW"
    assert DocumentLifecycleState.CONFIRMED == "CONFIRMED"
    assert DocumentLifecycleState.FAILED == "FAILED"
