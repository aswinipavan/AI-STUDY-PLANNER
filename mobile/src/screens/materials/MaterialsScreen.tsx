import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {Card} from '@/components/common/Card';
import {LoadingSpinner} from '@/components/common/LoadingSpinner';
import {EmptyState} from '@/components/common/EmptyState';
import {ErrorState} from '@/components/common/ErrorState';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {useMaterials, useDeleteMaterial} from '@/hooks/useMaterials';
import {useSubjects} from '@/hooks/useStudent';
import type {MaterialResponse, MaterialType} from '@/types/material.types';
import {formatDate} from '@/utils/dateUtils';
import {getErrorMessage} from '@/utils/errorHandler';

const MATERIAL_TYPE_ICONS: Record<MaterialType, string> = {
  DOCUMENT: '📄',
  VIDEO: '🎥',
  LINK: '🔗',
  NOTES: '📝',
  PAST_PAPER: '📑',
  SYLLABUS: '📋',
  OTHER: '📁',
};

export function MaterialsScreen() {
  const navigation = useNavigation<any>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const {data: materials, isLoading, error, refetch} = useMaterials();
  const {data: subjects} = useSubjects();
  const {mutate: deleteMaterial, isPending: isDeleting} = useDeleteMaterial();

  const filteredMaterials: MaterialResponse[] = (materials ?? []).filter(
    (m: MaterialResponse) => {
      if (!selectedSubjectId) return true;
      const subId = m.subjectId || m.subject?.id;
      return subId === selectedSubjectId;
    },
  );


  const handleDelete = (material: MaterialResponse) => {
    Alert.alert('Delete Material', `Are you sure you want to remove "${material.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMaterial(material.id, {
            onError: (err) => Alert.alert('Error', getErrorMessage(err)),
          });
        },
      },
    ]);
  };

  const handleOpenUrl = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Invalid Link', 'Cannot open this URL.');
      }
    });
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading study materials..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Study Materials"
        subtitle={`${filteredMaterials.length} items`}
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('UploadMaterial')}>
            <Text style={styles.addBtnText}>＋ Add</Text>
          </TouchableOpacity>
        }
      />

      {/* Subject Filter Chips */}
      {subjects && subjects.length > 0 && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{id: null, subjectName: 'All'}, ...subjects]}
            keyExtractor={(item) => item.id || 'all'}
            contentContainerStyle={styles.filterList}
            renderItem={({item}) => {
              const isSelected = selectedSubjectId === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedSubjectId(item.id)}>
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}>
                    {item.subjectName}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Material List */}
      <FlatList
        data={filteredMaterials}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading || isDeleting}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            icon="📚"
            title="No materials found"
            subtitle="Upload lecture notes, past papers, syllabus, or link resources."
            actionLabel="Add Study Material"
            onAction={() => navigation.navigate('UploadMaterial')}
          />
        }
        renderItem={({item}) => {
          const icon =
            item.materialType && item.materialType in MATERIAL_TYPE_ICONS
              ? MATERIAL_TYPE_ICONS[item.materialType as MaterialType]
              : '📁';
          const subjectDisplayName = item.subjectName || item.subject?.subjectName;

          return (
            <Card style={styles.materialCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.materialIcon}>{icon}</Text>
                <View style={styles.cardHeaderContent}>
                  <Text style={styles.materialTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {subjectDisplayName && (
                    <Text style={styles.subjectTag}>
                      {subjectDisplayName}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {item.aiSummary && (
                <View style={styles.aiSummaryBox}>
                  <Text style={styles.aiSummaryLabel}>🤖 AI Summary</Text>
                  <Text style={styles.aiSummaryText} numberOfLines={2}>
                    {item.aiSummary}
                  </Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  Added {formatDate(item.uploadedAt?.split('T')[0] || '')}
                </Text>
                {item.fileUrl && (
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => handleOpenUrl(item.fileUrl)}>
                    <Text style={styles.openBtnText}>Open / View →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DEEP,
  },
  addBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BG_BORDER,
    backgroundColor: COLORS.BG_SURFACE,
    paddingVertical: SPACING.SM,
  },
  filterList: {
    paddingHorizontal: SPACING.MD,
    gap: SPACING.SM,
  },
  filterChip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: 6,
    borderRadius: RADIUS.FULL,
    backgroundColor: COLORS.BG_ELEVATED,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  filterChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XXL,
  },
  materialCard: {
    marginBottom: SPACING.SM,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  materialIcon: {
    fontSize: 28,
  },
  cardHeaderContent: {
    flex: 1,
  },
  materialTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  subjectTag: {
    fontSize: 12,
    color: COLORS.PRIMARY_LIGHT,
    marginTop: 2,
  },
  deleteBtn: {
    padding: SPACING.XS,
  },
  deleteBtnText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 16,
    fontWeight: '700',
  },
  aiSummaryBox: {
    marginTop: SPACING.SM,
    padding: SPACING.SM,
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.MD,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.SECONDARY,
  },
  aiSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.SECONDARY,
    marginBottom: 2,
  },
  aiSummaryText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BG_BORDER,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
  },
  openBtn: {
    paddingVertical: 2,
  },
  openBtnText: {
    color: COLORS.PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
});
