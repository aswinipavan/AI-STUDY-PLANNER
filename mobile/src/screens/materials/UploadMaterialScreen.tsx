import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {Input} from '@/components/common/Input';
import {Button} from '@/components/common/Button';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {useSubjects} from '@/hooks/useStudent';
import {useSaveMaterial} from '@/hooks/useMaterials';
import type {MaterialType} from '@/types/material.types';
import type {SubjectResponse} from '@/types/student.types';
import {getErrorMessage} from '@/utils/errorHandler';


const materialSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  fileUrl: z.string().url('Please enter a valid URL (https://...)'),
  subjectId: z.string().optional(),
  textPreview: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

const MATERIAL_TYPES: {type: MaterialType; label: string; icon: string}[] = [
  {type: 'NOTES', label: 'Notes', icon: '📝'},
  {type: 'DOCUMENT', label: 'Document / PDF', icon: '📄'},
  {type: 'PAST_PAPER', label: 'Past Paper', icon: '📑'},
  {type: 'SYLLABUS', label: 'Syllabus', icon: '📋'},
  {type: 'VIDEO', label: 'Video Lecture', icon: '🎥'},
  {type: 'LINK', label: 'Web Link', icon: '🔗'},
];

export function UploadMaterialScreen() {
  const navigation = useNavigation<any>();
  const [selectedType, setSelectedType] = useState<MaterialType>('NOTES');

  const {data: subjects} = useSubjects();
  const {mutate: saveMaterial, isPending} = useSaveMaterial();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {errors},
  } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      title: '',
      fileUrl: '',
      subjectId: '',
      textPreview: '',
    },
  });

  const selectedSubjectId = watch('subjectId');

  const onSubmit = (data: MaterialFormData) => {
    saveMaterial(
      {
        request: {
          title: data.title,
          fileUrl: data.fileUrl,
          subjectId: data.subjectId || undefined,
          materialType: selectedType,
          textPreview: data.textPreview || undefined,
        } as any,
        fileUrl: data.fileUrl,
        fileType: 'application/pdf',
        fileSizeBytes: 1024,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Study material saved successfully!');
          navigation.goBack();
        },
        onError: (err) => {
          Alert.alert('Save Failed', getErrorMessage(err));
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Add Study Material" showBack />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Material Type Selector */}
          <Text style={styles.label}>Material Type</Text>
          <View style={styles.typeGrid}>
            {MATERIAL_TYPES.map((item) => {
              const isSelected = selectedType === item.type;
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.typeCard,
                    isSelected && styles.typeCardActive,
                  ]}
                  onPress={() => setSelectedType(item.type)}>
                  <Text style={styles.typeIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.typeLabel,
                      isSelected && styles.typeLabelActive,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form Fields */}
          <Controller
            control={control}
            name="title"
            render={({field: {onChange, value}}) => (
              <Input
                label="Title *"
                placeholder="e.g. Unit 3 Trees & Graphs Summary"
                value={value}
                onChangeText={onChange}
                error={errors.title?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="fileUrl"
            render={({field: {onChange, value}}) => (
              <Input
                label="Resource / Document URL *"
                placeholder="https://drive.google.com/... or https://..."
                value={value}
                onChangeText={onChange}
                keyboardType="default"
                autoCapitalize="none"
                error={errors.fileUrl?.message}
              />
            )}
          />

          {/* Subject Picker */}
          {subjects && subjects.length > 0 && (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Associated Subject (Optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subjectScroll}>
                {subjects.map((s: SubjectResponse) => {
                  const isSelected = selectedSubjectId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.subjectChip,
                        isSelected && styles.subjectChipActive,
                      ]}
                      onPress={() =>
                        setValue('subjectId', isSelected ? '' : s.id)
                      }>
                      <Text
                        style={[
                          styles.subjectChipText,
                          isSelected && styles.subjectChipTextActive,
                        ]}>
                        {s.subjectName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <Controller
            control={control}
            name="textPreview"
            render={({field: {onChange, value}}) => (
              <Input
                label="Key Notes / Topics Summary"
                placeholder="Brief summary or key takeaways for AI analysis"
                value={value ?? ''}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />


          <Button
            label="Save Material"
            onPress={handleSubmit(onSubmit)}
            loading={isPending}
            size="lg"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DEEP,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XXL,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  typeCard: {
    flexBasis: '31%',
    backgroundColor: COLORS.BG_SURFACE,
    borderRadius: RADIUS.MD,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.XS,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  typeCardActive: {
    backgroundColor: COLORS.PRIMARY + '20',
    borderColor: COLORS.PRIMARY,
  },
  typeIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: COLORS.PRIMARY_LIGHT,
  },
  fieldBlock: {
    marginBottom: SPACING.MD,
  },
  subjectScroll: {
    gap: SPACING.SM,
  },
  subjectChip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.FULL,
    backgroundColor: COLORS.BG_SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  subjectChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  subjectChipTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    marginTop: SPACING.LG,
  },
});
