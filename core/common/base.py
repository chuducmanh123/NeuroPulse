import time
from abc import ABC, abstractmethod
from typing import Any, Dict
from pydantic import BaseModel
from core.common.contracts import CoreResult, CoreError, CoreException


class BaseCore(ABC):
    """
    Interface trừu tượng chuẩn mực cho mọi Lõi trong hệ thống.
    Nguyên tắc thiết kế:
    1. Một hàm run duy nhất.
    2. Không giữ trạng thái trong bộ nhớ (Stateless).
    3. Chạy lại không gây tác dụng phụ (Idempotent).
    4. Mọi lỗi đều được gói vào CoreResult(ok=False), không ném exception tự do ra ngoài.
    """

    name: str = "base_core"
    version: str = "1.0.0"

    @abstractmethod
    def _execute(self, input_data: BaseModel) -> Dict[str, Any]:
        """Hàm logic nội bộ thực thi nhiệm vụ của lõi."""
        pass

    def run(self, input_data: BaseModel) -> CoreResult:
        """Hàm công khai duy nhất được gọi bởi Orchestrator, CLI runner hoặc Worker."""
        start_time = time.perf_counter()
        try:
            output_dict = self._execute(input_data)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return CoreResult(
                ok=True,
                data=output_dict,
                error=None,
                meta={
                    "core_name": self.name,
                    "core_version": self.version,
                    "elapsed_ms": elapsed_ms,
                },
            )
        except CoreException as ce:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            error = ce.error
            error.step = self.name
            return CoreResult(
                ok=False,
                data=None,
                error=error,
                meta={
                    "core_name": self.name,
                    "core_version": self.version,
                    "elapsed_ms": elapsed_ms,
                },
            )
        except Exception as ex:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return CoreResult(
                ok=False,
                data=None,
                error=CoreError(
                    code="UNHANDLED_CORE_EXCEPTION",
                    message=f"Lỗi không xác định trong lõi {self.name}: {str(ex)}",
                    retryable=False,
                    step=self.name,
                    details={"exception_type": type(ex).__name__},
                ),
                meta={
                    "core_name": self.name,
                    "core_version": self.version,
                    "elapsed_ms": elapsed_ms,
                },
            )
