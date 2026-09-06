package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.VideoRecommendationCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VideoRecommendationCacheRepository extends JpaRepository<VideoRecommendationCache, UUID> {

    Optional<VideoRecommendationCache> findByCacheKey(String cacheKey);

    Optional<VideoRecommendationCache> findByCacheKeyAndExpiresAtAfter(String cacheKey, OffsetDateTime now);

    @Modifying
    @Query("DELETE FROM VideoRecommendationCache v WHERE v.expiresAt < :now")
    void deleteExpiredEntries(@Param("now") OffsetDateTime now);

    void deleteByCacheKey(String cacheKey);
}
