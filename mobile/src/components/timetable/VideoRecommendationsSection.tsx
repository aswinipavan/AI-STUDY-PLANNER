import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {Card} from '@/components/common/Card';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {getVideoRecommendations, refreshVideoRecommendations} from '@/api/timetable.api';
import type {VideoRecommendation} from '@/types/timetable.types';

interface VideoRecommendationsSectionProps {
  slotId: string;
}

export function VideoRecommendationsSection({slotId}: VideoRecommendationsSectionProps) {
  const [videos, setVideos] = useState<VideoRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (slotId) {
      setIsLoading(true);
      setError(null);
      getVideoRecommendations(slotId)
        .then((res) => {
          if (isMounted) {
            setVideos(res.recommendations || []);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err?.message || 'Unable to load video recommendations');
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [slotId]);

  const handleRefresh = async () => {
    if (isRefreshing || !slotId) return;
    try {
      setIsRefreshing(true);
      setError(null);
      const res = await refreshVideoRecommendations(slotId);
      setVideos(res.recommendations || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh recommendations');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenVideo = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      // Graceful fallback
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.headerIcon}>📺</Text>
          <Text style={styles.sectionTitle}>Recommended Study Videos</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI Ranked</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isLoading || isRefreshing}
          style={styles.refreshBtn}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={styles.refreshText}>{isRefreshing ? '...' : '↻ Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {/* Loading state */}
      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Finding top educational lectures...</Text>
        </View>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.retryText}>Try Again ↻</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Video list */}
      {!isLoading && !error && videos.length > 0 && (
        <View style={styles.videoList}>
          {videos.map((vid) => {
            const isExcellent = vid.matchScore >= 85;
            return (
              <TouchableOpacity
                key={vid.videoId}
                style={styles.videoCard}
                onPress={() => handleOpenVideo(vid.videoUrl)}
                activeOpacity={0.75}>
                {/* Thumbnail */}
                <View style={styles.thumbnailWrapper}>
                  <Image
                    source={{uri: vid.thumbnailUrl}}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.playOverlay}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.infoWrapper}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {vid.title}
                  </Text>
                  {vid.channelTitle ? (
                    <Text style={styles.channelTitle} numberOfLines={1}>
                      {vid.channelTitle}
                    </Text>
                  ) : null}
                  <View style={styles.bottomRow}>
                    <View
                      style={[
                        styles.scoreBadge,
                        isExcellent ? styles.scoreExcellent : styles.scoreGood,
                      ]}>
                      <Text
                        style={[
                          styles.scoreText,
                          isExcellent ? styles.scoreTextExcellent : styles.scoreTextGood,
                        ]}>
                        {vid.matchScore}% Match
                      </Text>
                    </View>
                    <Text style={styles.watchText}>Watch ↗</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Empty state */}
      {!isLoading && !error && videos.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No video recommendations found yet. Tap Refresh to search YouTube.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.MD,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  aiBadge: {
    backgroundColor: '#ff4e4e22',
    borderColor: '#ff4e4e66',
    borderWidth: 1,
    borderRadius: RADIUS.FULL,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ff4e4e',
    textTransform: 'uppercase',
  },
  refreshBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  refreshText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: SPACING.MD,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  errorBox: {
    backgroundColor: '#ef444415',
    borderColor: '#ef444440',
    borderWidth: 1,
    borderRadius: RADIUS.MD,
    padding: SPACING.SM,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  retryText: {
    fontSize: 11,
    color: '#ff4e4e',
    fontWeight: '700',
    marginTop: 4,
  },
  videoList: {
    gap: SPACING.SM,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE_LIGHT,
    borderRadius: RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    overflow: 'hidden',
    padding: SPACING.XS + 2,
    gap: SPACING.SM,
  },
  thumbnailWrapper: {
    width: 100,
    height: 68,
    borderRadius: RADIUS.SM,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 14,
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 16,
  },
  channelTitle: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scoreBadge: {
    borderRadius: RADIUS.FULL,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  scoreExcellent: {
    backgroundColor: '#10b98122',
  },
  scoreGood: {
    backgroundColor: '#00e5c022',
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scoreTextExcellent: {
    color: '#10b981',
  },
  scoreTextGood: {
    color: '#00e5c0',
  },
  watchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff4e4e',
  },
  emptyBox: {
    backgroundColor: COLORS.SURFACE_LIGHT,
    borderRadius: RADIUS.MD,
    padding: SPACING.MD,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
});
