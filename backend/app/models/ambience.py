from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class ColorMode(str, Enum):
    WARM = "warm"
    COOL = "cool"
    NEUTRAL = "neutral"
    ROMANTIC = "romantic"
    ENERGETIC = "energetic"


class AmbiencePreset(str, Enum):
    DEFAULT = "default"
    ROMANTIC_DINNER = "romantic_dinner"
    FAMILY_GATHERING = "family_gathering"
    BUSINESS_MEETING = "business_meeting"
    CELEBRATION = "celebration"


class AmbienceSettings(BaseModel):
    table_number: int = Field(..., ge=1)
    brightness: int = Field(75, ge=0, le=100)
    color_mode: ColorMode = ColorMode.WARM
    preset: AmbiencePreset = AmbiencePreset.DEFAULT
    music_volume: int = Field(50, ge=0, le=100)


class AmbienceUpdate(BaseModel):
    brightness: Optional[int] = Field(None, ge=0, le=100)
    color_mode: Optional[ColorMode] = None
    preset: Optional[AmbiencePreset] = None
    music_volume: Optional[int] = Field(None, ge=0, le=100)


class AmbienceResponse(AmbienceSettings):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True
        use_enum_values = True
