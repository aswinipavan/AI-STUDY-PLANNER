package com.aistudyplanner.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.*;

import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateProfileRequest {

    private String fullName;
    private String email;
    private String collegeName;
    private Integer semester;
    private String department;
    private String phoneNumber;
    private BigDecimal availableHoursPerDay;
    private String preferredStudyTime;
    private String profilePictureUrl;

    private static final Pattern DIGIT_PATTERN = Pattern.compile("\\d+");

    @JsonSetter("semester")
    public void setSemester(Object value) {
        if (value == null) {
            this.semester = null;
        } else if (value instanceof Number n) {
            this.semester = n.intValue();
        } else if (value instanceof String s) {
            String trimmed = s.trim();
            if (trimmed.isEmpty() || "null".equalsIgnoreCase(trimmed)) {
                this.semester = null;
            } else {
                Matcher m = DIGIT_PATTERN.matcher(trimmed);
                if (m.find()) {
                    this.semester = Integer.parseInt(m.group());
                } else {
                    this.semester = null;
                }
            }
        }
    }
}
