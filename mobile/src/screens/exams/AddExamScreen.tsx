import React, {useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {useCreateExam, useUpdateExam, useAllExams} from '@/hooks/useExams';
import {useSubjects} from '@/hooks/useStudent';
import {Input} from '@/components/common/Input';
import {Button} from '@/components/common/Button';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import type {ExamsStackParamList} from '@/navigation/AppTabs';
import {getErrorMessage} from '@/utils/errorHandler';
import type {ExamResponse} from '@/types/exam.types';
import type {SubjectResponse} from '@/types/student.types';

type AddExamNav = NativeStackNavigationProp<ExamsStackParamList, 'AddExam'>;
type AddExamRoute = RouteProp<ExamsStackParamList, 'AddExam'>;

const schema = z.object({
  subjectId: z.string().min(1, 'Please select a subject'),
  examName: z.string().optional(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  examType: z.string().optional(),
  syllabusCovered: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const EXAM_TYPES = ['QUIZ', 'MIDTERM', 'SEMESTER', 'PRACTICAL', 'ASSIGNMENT'];

export function AddExamScreen() {
  const navigation = useNavigation<AddExamNav>();
  const route = useRoute<AddExamRoute>();
  const examId = route.params?.examId;
  const isEdit = !!examId;

  const {data: subjects} = useSubjects();
  const {data: allExams} = useAllExams();
  const {mutate: createExam, isPending: isCreating} = useCreateExam();
  const {mutate: updateExam, isPending: isUpdating} = useUpdateExam();

  const {control, handleSubmit, setValue, watch, formState: {errors}} = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      subjectId: '',
      examName: '',
      examDate: new Date().toISOString().split('T')[0],
      examType: 'SEMESTER',
      syllabusCovered: '',
    },
  });

  const selectedSubjectId = watch('subjectId');
  const selectedExamType = watch('examType');

  useEffect(() => {
    if (isEdit && allExams) {
      const exam = allExams.find((e: ExamResponse) => e.id === examId);
      if (exam) {
        setValue('subjectId', exam.subject.id);
        setValue('examName', exam.examName ?? '');
        setValue('examDate', exam.examDate);
        setValue('examType', exam.examType ?? 'SEMESTER');
        setValue('syllabusCovered', exam.syllabusCovered ?? '');
      }
    }
  }, [isEdit, examId, allExams, setValue]);

  const onSubmit = (data: FormData) => {
    const payload = {
      subjectId: data.subjectId,
      examName: data.examName || undefined,
      examDate: data.examDate,
      examType: data.examType || undefined,
      syllabusCovered: data.syllabusCovered || undefined,
    };

    const options = {
      onSuccess: () => navigation.goBack(),
      onError: (err: unknown) => Alert.alert('Error', getErrorMessage(err)),
    };

    if (isEdit && examId) {
      updateExam({id: examId, data: payload}, options);
    } else {
      createExam(payload, options);
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={isEdit ? 'Edit Exam' : 'Add Exam'} showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">

          {/* Subject picker */}
          <Text style={styles.label}>Subject *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
            {(subjects ?? []).map((subject: SubjectResponse) => (
              <Controller
                key={subject.id}
                control={control}
                name="subjectId"
                render={({field: {onChange}}) => (
                  <TouchableOpacity
                    onPress={() => onChange(subject.id)}
                    style={[
                      styles.subjectChip,
                      selectedSubjectId === subject.id && styles.subjectChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.subjectChipText,
                        selectedSubjectId === subject.id && styles.subjectChipTextActive,
                      ]}>
                      {subject.subjectName}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ))}
          </ScrollView>
          {errors.subjectId && (
            <Text style={styles.errorText}>{errors.subjectId.message}</Text>
          )}

          <Controller
            control={control}
            name="examName"
            render={({field: {onChange, value}}) => (
              <Input
                label="Exam Name (optional)"
                placeholder="e.g. Unit Test 1"
                value={value ?? ''}
                onChangeText={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="examDate"
            render={({field: {onChange, value}}) => (
              <Input
                label="Exam Date *"
                placeholder="YYYY-MM-DD"
                value={value}
                onChangeText={onChange}
                error={errors.examDate?.message}
                keyboardType="numeric"
              />
            )}
          />

          {/* Exam type picker */}
          <Text style={styles.label}>Exam Type</Text>
          <View style={styles.typeRow}>
            {EXAM_TYPES.map(type => (
              <Controller
                key={type}
                control={control}
                name="examType"
                render={({field: {onChange}}) => (
                  <TouchableOpacity
                    onPress={() => onChange(type)}
                    style={[
                      styles.typeChip,
                      selectedExamType === type && styles.typeChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.typeChipText,
                        selectedExamType === type && styles.typeChipTextActive,
                      ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ))}
          </View>

          <Controller
            control={control}
            name="syllabusCovered"
            render={({field: {onChange, value}}) => (
              <Input
                label="Syllabus / Topics"
                placeholder="e.g. Chapters 1-5, Arrays, Linked Lists"
                value={value ?? ''}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />

          <Button
            label={isEdit ? 'Save Changes' : 'Add Exam'}
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            size="lg"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.BG_DEEP},
  flex: {flex: 1},
  content: {padding: SPACING.MD, paddingBottom: SPACING.XXL},
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  subjectScroll: {marginBottom: SPACING.MD},
  subjectChip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.FULL,
    backgroundColor: COLORS.BG_SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    marginRight: SPACING.SM,
  },
  subjectChipActive: {backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY},
  subjectChipText: {color: COLORS.TEXT_SECONDARY, fontWeight: '600', fontSize: 13},
  subjectChipTextActive: {color: '#fff'},
  errorText: {color: COLORS.DANGER, fontSize: 12, marginBottom: SPACING.SM},
  typeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.XS, marginBottom: SPACING.MD},
  typeChip: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: 6,
    borderRadius: RADIUS.SM,
    backgroundColor: COLORS.BG_SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  typeChipActive: {backgroundColor: COLORS.SECONDARY + '22', borderColor: COLORS.SECONDARY},
  typeChipText: {color: COLORS.TEXT_SECONDARY, fontWeight: '600', fontSize: 12},
  typeChipTextActive: {color: COLORS.SECONDARY},
  submitBtn: {marginTop: SPACING.LG},
});
