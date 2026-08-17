package com.aistudyplanner.service.nlp;

import com.aistudyplanner.model.ProcessingStatus;
import com.aistudyplanner.model.entity.Material;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.ExamRepository;
import com.aistudyplanner.repository.MarksRepository;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.service.GroqService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DocumentIntelligenceTest {

    private NlpTextPreprocessor preprocessor;
    private ChapterDetector chapterDetector;
    private TopicExtractor topicExtractor;
    private DifficultyAnalyzer difficultyAnalyzer;

    @Mock
    private MaterialRepository materialRepository;
    @Mock
    private MarksRepository marksRepository;
    @Mock
    private ExamRepository examRepository;
    @Mock
    private GroqService groqService;

    private DocumentIntelligenceService documentIntelligenceService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        preprocessor = new NlpTextPreprocessor();
        chapterDetector = new ChapterDetector();
        topicExtractor = new TopicExtractor(preprocessor);
        difficultyAnalyzer = new DifficultyAnalyzer(preprocessor);
        objectMapper = new ObjectMapper();

        documentIntelligenceService = new DocumentIntelligenceService(
                materialRepository,
                marksRepository,
                examRepository,
                groqService,
                preprocessor,
                chapterDetector,
                topicExtractor,
                difficultyAnalyzer,
                objectMapper
        );
    }

    @Test
    void testPdfTextExtraction_ValidPdf() throws IOException {
        // Create an in-memory PDF using PDFBox
        byte[] pdfBytes;
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
                stream.newLineAtOffset(50, 700);
                stream.showText("Chapter 1: Advanced Graph Algorithms");
                stream.newLineAtOffset(0, -30);
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.showText("Breadth First Search and Depth First Search are fundamental graph traversals.");
                stream.endText();
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            pdfBytes = baos.toByteArray();
        }

        String extracted = documentIntelligenceService.extractTextFromPdfBytes(pdfBytes);
        assertNotNull(extracted);
        assertTrue(extracted.contains("Chapter 1: Advanced Graph Algorithms"));
        assertTrue(extracted.contains("Breadth First Search"));
    }

    @Test
    void testEmptyPdfExtraction_GracefulHandling() {
        String extracted = documentIntelligenceService.extractTextFromPdfBytes(new byte[0]);
        assertEquals("", extracted);

        String corrupted = documentIntelligenceService.extractTextFromPdfBytes(new byte[]{1, 2, 3, 4});
        assertEquals("", corrupted);
    }

    @Test
    void testChapterDetection_NumberedAndPrefixPatterns() {
        String text = "Chapter 1: Introduction to Artificial Intelligence\n" +
                "Intelligent agents perceive their environment.\n\n" +
                "1.1 Search Algorithms\n" +
                "Breadth First Search finds the shortest path.\n\n" +
                "Chapter 2: Machine Learning Fundamentals\n" +
                "Supervised learning trains on labeled data.\n\n" +
                "2.1 Neural Networks\n" +
                "Backpropagation calculates gradients through layers.";

        List<ChapterDetector.ExtractedChapter> chapters = chapterDetector.detectChapters(text);
        assertNotNull(chapters);
        assertTrue(chapters.size() >= 2);
        assertTrue(chapters.get(0).getTitle().contains("Introduction to Artificial Intelligence"));
        assertTrue(chapters.get(1).getTitle().contains("Machine Learning Fundamentals"));
    }

    @Test
    void testTopicAndKeywordExtraction() {
        String text = "Binary Search Trees maintain sorted elements in logarithmic time complexity. " +
                "An AVL Tree is a self-balancing binary search tree where the difference between heights of left and right subtrees is at most one. " +
                "Inorder traversal of a binary search tree visits nodes in non-decreasing key order.";

        List<ChapterDetector.ExtractedChapter> chapters = chapterDetector.detectChapters(text);
        List<TopicExtractor.ExtractedTopic> topics = topicExtractor.extractTopics(text, chapters);
        List<String> keywords = topicExtractor.extractTopKeywordsForText(text, 10);

        assertFalse(topics.isEmpty());
        assertFalse(keywords.isEmpty());
        assertTrue(keywords.stream().anyMatch(k -> k.equalsIgnoreCase("tree") || k.equalsIgnoreCase("binary") || k.equalsIgnoreCase("search")));
    }

    @Test
    void testDifficultyCalculation_WeakStudentAndNearExam() {
        String advancedText = "Dynamic programming solves optimization problems using optimal substructure and overlapping subproblems. " +
                "The recurrence relation defines the state transition equation for the algorithm complexity.";

        // Weak student (42% average), exam in 3 days
        DifficultyAnalyzer.DifficultyResult result = difficultyAnalyzer.analyzeDifficulty(advancedText, 42.0, 3);
        assertNotNull(result);
        assertEquals("HARD", result.getLevel());
        assertTrue(result.getScore() >= 70);
        assertTrue(result.getReason().contains("low (42.0%)") || result.getReason().contains("Exam scheduled"));
    }

    @Test
    void testProcessMaterialAsync_NoGroqFallback() {
        UUID materialId = UUID.randomUUID();
        Student student = Student.builder().id(UUID.randomUUID()).build();
        Subject subject = Subject.builder().id(UUID.randomUUID()).subjectName("Computer Science").build();
        Material material = Material.builder()
                .id(materialId)
                .student(student)
                .subject(subject)
                .title("Data Structures Lecture Notes")
                .processingStatus(ProcessingStatus.PENDING)
                .build();

        when(materialRepository.findById(materialId)).thenReturn(Optional.of(material));
        when(groqService.summarizeMaterial(any())).thenThrow(new RuntimeException("Groq API unavailable"));

        String text = "Chapter 1: Sorting and Searching\n" +
                "Quicksort uses divide and conquer with a pivot element.\n" +
                "Mergesort guarantees O(N log N) worst-case time complexity.";

        documentIntelligenceService.processMaterialAsync(materialId, text);

        assertEquals(ProcessingStatus.COMPLETED, material.getProcessingStatus());
        assertNotNull(material.getExtractedTopics());
        assertNotNull(material.getExtractedChapters());
        assertNotNull(material.getOverallDifficulty());
        assertTrue(material.getAiSummary().contains("Document Analysis")); // Deterministic summary fallback
        verify(materialRepository, atLeastOnce()).save(material);
    }
}
