package com.aistudyplanner.model.dto.response;

import com.aistudyplanner.model.VerificationStatus;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyEvidenceResponse {

    private UUID id;
    private UUID slotId;
    private String fileName;
    private String fileUrl;
    private String fileType;
    private Long fileSizeBytes;
    private VerificationStatus verificationStatus;
    private Integer score;
    private String summary;
    private List<String> matchedTopics;
    private List<String> missingTopics;
    private String feedback;
    private Integer confidence;
    private OffsetDateTime verifiedAt;
    private Boolean isUsedForCompletion;
    private OffsetDateTime submittedAt;
}
