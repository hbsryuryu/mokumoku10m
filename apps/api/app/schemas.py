"""API の入出力の共通設定。

JSON のキーは camelCase（例: `displayName`、`startPriceYen`）。Python 側は snake_case で書く。
docs/api/openapi.md の命名（`amountYen`、`expectedVersion`、`endsAt`）に合わせる。
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
