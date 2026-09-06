package com.aistudyplanner.service;

import com.aistudyplanner.service.MaterialTopicReader.TopicDetail;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("VideoQueryGeneratorService Unit Tests")
class VideoQueryGeneratorServiceTest {

    private VideoQueryGeneratorService service;

    @BeforeEach
    void setUp() {
        service = new VideoQueryGeneratorService();
    }

    @Test
    @DisplayName("cleans timetable prefixes and LaTeX formulas from topic strings")
    void cleansPrefixesAndLatexFormulas() {
        String raw = "Revision: Chapter 4 - Fourier Series $T(x) \\approx 254.65 \\sin x + 9.43 \\sin 3x$";
        String cleaned = service.cleanTopicString(raw);

        assertThat(cleaned)
                .doesNotContain("Revision:")
                .doesNotContain("$")
                .doesNotContain("\\approx")
                .contains("Fourier Series");
    }

    @Test
    @DisplayName("generates multi-query search portfolio for curriculum topic")
    void generatesMultiQuerySearchPortfolio() {
        TopicDetail detail = TopicDetail.builder()
                .topic("Fourier Sine Series Expansion")
                .chapter("Chapter 4 - Fourier Analysis")
                .whatToStudy(List.of("• Key definitions & terminology: Dirichlet conditions, harmonics", "• Solved problems"))
                .difficulty("MEDIUM")
                .difficultyScore(65)
                .build();

        List<String> queries = service.generateQueries(detail, "Engineering Mathematics III");

        assertThat(queries).isNotEmpty();
        assertThat(queries.size()).isGreaterThanOrEqualTo(3);

        // Verify key queries are constructed
        assertThat(queries).anyMatch(q -> q.toLowerCase().contains("fourier sine series expansion"));
        assertThat(queries).anyMatch(q -> q.toLowerCase().contains("solved examples tutorial"));
        assertThat(queries).anyMatch(q -> q.toLowerCase().contains("concept explanation lecture"));
    }

    @Test
    @DisplayName("gracefully handles empty topic and falls back to subject and chapter")
    void handlesEmptyTopicGracefully() {
        TopicDetail detail = TopicDetail.builder()
                .topic("")
                .chapter("Database Normalization")
                .whatToStudy(List.of())
                .build();

        List<String> queries = service.generateQueries(detail, "Database Management Systems");

        assertThat(queries).isNotEmpty();
        assertThat(queries.get(0)).contains("Database Normalization");
    }
}
