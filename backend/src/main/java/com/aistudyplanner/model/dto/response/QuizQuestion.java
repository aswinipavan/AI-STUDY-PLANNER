package com.aistudyplanner.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestion {
    private Integer id;
    private String question;
    private List<String> options;
    private Integer correctOptionIndex;
    private String explanation;
}
