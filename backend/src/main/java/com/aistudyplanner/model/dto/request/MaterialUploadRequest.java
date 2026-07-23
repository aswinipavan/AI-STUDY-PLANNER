package com.aistudyplanner.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MaterialUploadRequest {

    private UUID subjectId; // optional

    private String title;
    
    private String fileName;
    
    private String textPreview;
    
    private com.aistudyplanner.model.MaterialType materialType;
}
