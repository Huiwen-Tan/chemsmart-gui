from pydantic import BaseModel, Field


class PluginDescriptor(BaseModel):
    name: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    version: str = Field(min_length=1)
