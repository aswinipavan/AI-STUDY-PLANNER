package com.aistudyplanner.service.nlp;

import com.aistudyplanner.model.ProcessingStatus;
import com.aistudyplanner.model.entity.Exam;
import com.aistudyplanner.model.entity.Material;
import com.aistudyplanner.repository.ExamRepository;
import com.aistudyplanner.repository.MarksRepository;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.service.GroqService;
import com.aistudyplanner.service.StorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * High-performance Document Intelligence & NLP Service.
 * Coordinates PDF text extraction (Apache PDFBox), chapter detection,
 * TF-IDF topic extraction, complexity scoring, and optional Groq semantic enhancement.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentIntelligenceService {

    private final MaterialRepository materialRepository;
    private final StorageService storageService;
    private final MarksRepository marksRepository;
    private final ExamRepository examRepository;
    private final GroqService groqService;
    private final NlpTextPreprocessor preprocessor;
    private final ChapterDetector chapterDetector;
    private final TopicExtractor topicExtractor;
    private final DifficultyAnalyzer difficultyAnalyzer;
    private final ObjectMapper objectMapper;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    /**
     * Asynchronously process study material end-to-end.
     */
    @Async
    @Transactional
    public void processMaterialAsync(UUID materialId, String fallbackPreview) {
        log.info("Starting document intelligence pipeline for material: {}", materialId);
        Material material = materialRepository.findById(materialId).orElse(null);
        if (material == null) {
            log.warn("Material not found for processing: {}", materialId);
            return;
        }

        material.setProcessingStatus(ProcessingStatus.PROCESSING);
        materialRepository.save(material);

        try {
            boolean isImage = material.getMaterialType() == com.aistudyplanner.model.MaterialType.IMAGE
                    || (material.getFileType() != null && material.getFileType().toLowerCase().contains("image"))
                    || (material.getFileName() != null && material.getFileName().toLowerCase().matches(".*\\.(jpg|jpeg|png|webp|gif)"));

            if (isImage) {
                log.info("Processing visual study material / image for material {}", materialId);
                material.setProcessingStatus(ProcessingStatus.COMPLETED);
                material.setOverallDifficulty("MEDIUM");
                material.setDifficultyScore(50);
                material.setDifficultyReason("Visual study material / lecture diagram or handwritten notes.");
                
                String title = material.getTitle() != null ? material.getTitle() : material.getFileName();
                List<Map<String, String>> imageTopics = List.of(
                        Map.of("name", title, "chapter", "Visual Study Notes")
                );
                material.setExtractedTopics(objectMapper.writeValueAsString(imageTopics));
                material.setExtractedChapters(objectMapper.writeValueAsString(List.of("Visual Study Notes")));
                material.setExtractedKeywords(objectMapper.writeValueAsString(List.of("diagram", "notes", "visual concept")));
                if (material.getAiSummary() == null || material.getAiSummary().isBlank()) {
                    material.setAiSummary("Visual academic asset: " + title + " (" + material.getFileName() + ")");
                }
                material.setErrorMessage(null);
                materialRepository.save(material);
                return;
            }

            // 1. Extract text from file or preview
            String extractedText = extractDocumentText(material, fallbackPreview);

            if (extractedText == null || extractedText.trim().length() < 20) {
                log.warn("Insufficient text extracted from material {}", materialId);
                material.setProcessingStatus(ProcessingStatus.COMPLETED);
                material.setOverallDifficulty("EASY");
                material.setDifficultyScore(30);
                material.setDifficultyReason("Introductory material or document with limited extracted text.");
                material.setExtractedTopics("[]");
                material.setExtractedChapters("[]");
                material.setExtractedKeywords("[]");
                materialRepository.save(material);
                return;
            }

            String normalizedText = preprocessor.normalize(extractedText);

            // 2. Detect Chapters & Sections
            List<ChapterDetector.ExtractedChapter> chapters = chapterDetector.detectChapters(normalizedText);

            // 3. Extract Topics & Keywords
            List<TopicExtractor.ExtractedTopic> topics = topicExtractor.extractTopics(normalizedText, chapters);
            List<String> keywords = topicExtractor.extractTopKeywordsForText(normalizedText, 15);

            // 4. Retrieve student performance & exam context for difficulty analysis
            Double studentAvg = getStudentSubjectAverage(material);
            Integer daysToExam = getDaysToUpcomingExam(material);

            // 5. Complexity & Difficulty Analysis
            DifficultyAnalyzer.DifficultyResult diffResult = difficultyAnalyzer.analyzeDifficulty(normalizedText, studentAvg, daysToExam);

            // 6. Optional Groq Semantic Enhancement (with automatic fallback)
            String summary = material.getAiSummary();
            if (summary == null || summary.isBlank()) {
                try {
                    summary = groqService.summarizeMaterial(normalizedText);
                } catch (Exception e) {
                    log.warn("Groq summarization unavailable, creating deterministic summary: {}", e.getMessage());
                    summary = createDeterministicSummary(topics, keywords);
                }
            }

            // If subject was not assigned, try auto-categorization
            if (material.getSubject() == null && (material.getAiCategorizedSubject() == null || material.getAiCategorizedSubject().isBlank())) {
                try {
                    String catSubject = groqService.categorizeMaterial(material.getTitle(), normalizedText);
                    if (catSubject != null && !catSubject.isBlank()) {
                        material.setAiCategorizedSubject(catSubject);
                    }
                } catch (Exception e) {
                    log.warn("Groq categorization skipped: {}", e.getMessage());
                }
            }

            // 7. Persist structured intelligence
            material.setAiSummary(summary);
            // Keep a bounded text excerpt for grounded AI retrieval. This is not exposed to the client.
            material.setExtractedText(normalizedText.substring(0, Math.min(normalizedText.length(), 20_000)));
            material.setProcessingStatus(ProcessingStatus.COMPLETED);
            material.setExtractedChapters(objectMapper.writeValueAsString(chapters));
            material.setExtractedTopics(objectMapper.writeValueAsString(topics));
            material.setExtractedKeywords(objectMapper.writeValueAsString(keywords));
            material.setOverallDifficulty(diffResult.getLevel());
            material.setDifficultyScore(diffResult.getScore());
            material.setDifficultyReason(diffResult.getReason());
            material.setErrorMessage(null);

            materialRepository.save(material);
            log.info("Document intelligence completed successfully for material: {}. Extracted {} topics, {} chapters, difficulty: {}",
                    materialId, topics.size(), chapters.size(), diffResult.getLevel());

        } catch (Exception e) {
            log.error("Document intelligence pipeline failed for material {}: {}", materialId, e.getMessage(), e);
            material.setProcessingStatus(ProcessingStatus.FAILED);
            material.setErrorMessage("Processing failed: " + e.getMessage());
            materialRepository.save(material);
        }
    }

    /**
     * Extract text from PDF or DOCX files, or use text supplied by the upload client.
     */
    public String extractDocumentText(Material material, String fallbackPreview) {
        // Priority 1: Download and extract supported document formats.
        if (material.getFileUrl() != null && !material.getFileUrl().isBlank()) {
            String fileType = material.getFileType() != null ? material.getFileType().toLowerCase() : "";
            boolean isPdf = fileType.contains("pdf") || material.getFileUrl().toLowerCase().endsWith(".pdf");
            boolean isDocx = fileType.contains("docx") || material.getFileUrl().toLowerCase().endsWith(".docx");

            try {
                byte[] documentBytes = loadFileBytes(material.getFileUrl());
                if (documentBytes != null && documentBytes.length > 0) {
                    String documentText;
                    if (isPdf) {
                        documentText = extractTextFromPdfBytes(documentBytes);
                    } else if (isDocx) {
                        documentText = extractTextFromDocxBytes(documentBytes);
                    } else {
                        documentText = extractTextUsingTika(documentBytes);
                    }
                    if (documentText != null && !documentText.isBlank()) {
                        return documentText;
                    }
                }
            } catch (Exception e) {
                log.warn("Could not extract text from material {}: {}", material.getId(), e.getMessage());
            }
        }

        // Priority 2: Return provided fallback text preview
        if (fallbackPreview != null && !fallbackPreview.isBlank()) {
            return fallbackPreview;
        }

        return material.getTitle() != null ? material.getTitle() : "";
    }

    /**
     * Extract text from PDF bytes using Apache PDFBox.
     */
    public String extractTextFromPdfBytes(byte[] pdfBytes) {
        if (pdfBytes == null || pdfBytes.length == 0) return "";
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            if (document.isEncrypted()) {
                log.warn("PDF is encrypted, cannot extract text.");
                return "";
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            stripper.setStartPage(1);
            stripper.setEndPage(Math.min(document.getNumberOfPages(), 100)); // Cap at first 100 pages for speed/safety
            return stripper.getText(document);
        } catch (Exception e) {
            log.error("PDFBox text extraction failed: {}", e.getMessage());
            return "";
        }
    }

    /**
     * Extract text from Office Open XML Word documents without adding a heavy runtime dependency.
     * Legacy .doc files are intentionally not parsed because they are a binary format; clients should
     * upload .docx or PDF so the text can be analysed reliably.
     */
    public String extractTextFromDocxBytes(byte[] docxBytes) {
        if (docxBytes == null || docxBytes.length == 0) return "";
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(docxBytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    String xml = new String(zip.readAllBytes(), StandardCharsets.UTF_8);
                    return xml
                            .replaceAll("</w:p>", "\n")
                            .replaceAll("<[^>]+>", " ")
                            .replaceAll("\\s+", " ")
                            .trim();
                }
            }
        } catch (Exception e) {
            log.warn("DOCX text extraction failed: {}", e.getMessage());
        }
        return "";
    }

    /**
     * Universal document parser fallback using Apache Tika for TXT, MD, PPTX, EPUB, RTF.
     */
    public String extractTextUsingTika(byte[] documentBytes) {
        if (documentBytes == null || documentBytes.length == 0) return "";
        try {
            String direct = new String(documentBytes, StandardCharsets.UTF_8).trim();
            if (!direct.isBlank() && !direct.contains("\u0000")) {
                return direct;
            }
            org.apache.tika.Tika tika = new org.apache.tika.Tika();
            return tika.parseToString(new ByteArrayInputStream(documentBytes)).trim();
        } catch (Exception e) {
            log.warn("Tika text extraction fallback failed: {}", e.getMessage());
            return new String(documentBytes, StandardCharsets.UTF_8).trim();
        }
    }

    /** Prefix of URLs produced by the local filesystem storage backend. */
    private static final String LOCAL_FILE_PREFIX = "/api/files/";

    /**
     * Load the stored bytes for a material.
     *
     * <p>Locally stored files get a root-relative URL ({@code /api/files/<bucket>/<objectPath>}),
     * which has no scheme or host, so handing it to an {@link HttpClient} throws
     * IllegalArgumentException and yields no bytes — the NLP pipeline then silently fell back to
     * the material title, producing one placeholder topic named after the file instead of the real
     * chapters. Local URLs are therefore read straight off disk through {@link StorageService},
     * which also avoids an authenticated HTTP round-trip to ourselves. Absolute URLs (Supabase in
     * production) still go over HTTP unchanged.
     */
    private byte[] loadFileBytes(String urlStr) {
        if (urlStr == null || urlStr.isBlank()) {
            return null;
        }
        if (urlStr.startsWith(LOCAL_FILE_PREFIX)) {
            return readLocalBytes(urlStr);
        }
        return downloadFileBytes(urlStr);
    }

    /** Read a {@code /api/files/<bucket>/<objectPath>} URL from the local storage root. */
    private byte[] readLocalBytes(String urlStr) {
        try {
            String rest = urlStr.substring(LOCAL_FILE_PREFIX.length());
            int slash = rest.indexOf('/');
            if (slash <= 0 || slash == rest.length() - 1) {
                log.warn("Malformed local file URL: {}", urlStr);
                return null;
            }
            String bucket = rest.substring(0, slash);
            String objectPath = rest.substring(slash + 1);
            Path file = storageService.resolveLocal(bucket, objectPath);
            if (file == null) {
                log.warn("Locally stored file is missing: {}", urlStr);
                return null;
            }
            return Files.readAllBytes(file);
        } catch (Exception e) {
            log.warn("Could not read local file {}: {}", urlStr, e.getMessage());
            return null;
        }
    }

    private byte[] downloadFileBytes(String urlStr) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(urlStr))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<byte[]> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return response.body();
            }
        } catch (Exception e) {
            log.debug("HTTP download failed for {}: {}", urlStr, e.getMessage());
        }
        return null;
    }

    private Double getStudentSubjectAverage(Material material) {
        if (material.getSubject() == null || material.getStudent() == null) return null;
        try {
            List<Object[]> avgData = marksRepository.findAveragePercentageBySubject(material.getStudent().getId());
            for (Object[] row : avgData) {
                if (material.getSubject().getId().equals(row[0])) {
                    return ((Number) row[1]).doubleValue();
                }
            }
        } catch (Exception e) {
            log.debug("Could not fetch subject average: {}", e.getMessage());
        }
        return null;
    }

    private Integer getDaysToUpcomingExam(Material material) {
        if (material.getSubject() == null || material.getStudent() == null) return null;
        try {
            List<Exam> exams = examRepository.findAllByStudentIdOrderByExamDateAsc(
                    material.getStudent().getId(),
                    org.springframework.data.domain.PageRequest.of(0, 50)
            ).getContent();
            LocalDate now = LocalDate.now();
            for (Exam exam : exams) {
                if (exam.getSubject() != null && exam.getSubject().getId().equals(material.getSubject().getId())) {
                    if (exam.getExamDate() != null && !exam.getExamDate().isBefore(now)) {
                        return (int) ChronoUnit.DAYS.between(now, exam.getExamDate());
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Could not fetch upcoming exam days: {}", e.getMessage());
        }
        return null;
    }

    private String createDeterministicSummary(List<TopicExtractor.ExtractedTopic> topics, List<String> keywords) {
        StringBuilder sb = new StringBuilder();
        sb.append("Document Analysis & Key Topics:\n");
        int count = 0;
        for (TopicExtractor.ExtractedTopic t : topics) {
            if (count++ >= 5) break;
            sb.append("• ").append(t.getName());
            if (t.getChapter() != null && !t.getChapter().isBlank()) {
                sb.append(" (").append(t.getChapter()).append(")");
            }
            sb.append("\n");
        }
        if (!keywords.isEmpty()) {
            sb.append("\nKey Terms: ").append(String.join(", ", keywords.subList(0, Math.min(6, keywords.size()))));
        }
        return sb.toString();
    }
}
