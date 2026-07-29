package com.a508.backend.mypage.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record MyPlaceUpdateRequest(

        @JsonProperty("my_place_name")
        String myPlaceName,

        String address,

        BigDecimal latitude,

        BigDecimal longitude
) {
}