import React, {useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {useSubjects, useCreateSubject, useUpdateSubject} from '@/hooks/useStudent';
import {Input} from '@/components/common/Input';
import {Button} from '@/components/common/Button';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import type {SubjectsStackParamList} from '@/navigation/AppTabs';
import {getErrorMessage} from '@/utils/errorHandler';
import type {SubjectResponse} from '@/types/student.types';

type AddSubjectNav = NativeStackNavigationProp<SubjectsStackParamList, 'AddSubject'>;
type AddSubjectRoute = RouteProp<SubjectsStackParamList, 'AddSubject'>;

const schema = z.object({
  subjectName: z.string().min(1, 'Subject name is required'),
  subjectCode: z.string().optional(),
  credits: z.string().optional(),
  difficultyLevel: z.string().optional(),
  semester: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const DIFFICULTY_OPTIONS = [
  {value: '1', label: 'Easy', color: COLORS.DIFFICULTY_1},
  {value: '2', label: 'Simple', color: COLORS.DIFFICULTY_2},
  {value: '3', label: 'Medium', color: COLORS.DIFFICULTY_3},
  {value: '4', label: 'Hard', color: COLORS.DIFFICULTY_4},
  {value: '5', label: 'Expert', color: COLORS.DIFFICULTY_5},
];

export function AddSubjectScreen() {
  const navigation = useNavigation<AddSubjectNav>();
  const route = useRoute<AddSubjectRoute>();
  const subjectId = route.params?.subjectId;
  const isEdit = !!subjectId;

  const {data: subjects} = useSubjects();
  const {mutate: createSubject, isPending: isCreating} = useCreateSubject();
  const {mutate: updateSubject, isPending: isUpdating} = useUpdateSubject();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {errors},
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      subjectName: '',
      subjectCode: '',
      credits: '',
      difficultyLevel: '3',
      semester: '',
    },
  });

  const selectedDifficulty = watch('difficultyLevel');

  // Pre-fill form when editing
  useEffect(() => {
    if (isEdit && subjects) {
      const subject = subjects.find((s: SubjectResponse) => s.id === subjectId);
      if (subject) {
        setValue('subjectName', subject.subjectName);
        setValue('subjectCode', subject.subjectCode ?? '');
        setValue('credits', subject.credits?.toString() ?? '');
        setValue('difficultyLevel', subject.difficultyLevel?.toString() ?? '3');
        setValue('semester', subject.semester?.toString() ?? '');
      }
    }
  }, [isEdit, subjectId, subjects, setValue]);

  const onSubmit = (data: FormData) => {
    const payload = {
      subjectName: data.subjectName,
      subjectCode: data.subjectCode || undefined,
      credits: data.credits ? parseInt(data.credits, 10) : undefined,
      difficultyLevel: data.difficultyLevel ? parseInt(data.difficultyLevel, 10) : 3,
      semester: data.semester ? parseInt(data.semester, 10) : undefined,
    };

    const options = {
      onSuccess: () => navigation.goBack(),
      onError: (err: unknown) =>
        Alert.alert('Error', getErrorMessage(err)),
    };

    if (isEdit && subjectId) {
      updateSubject({id: subjectId, data: payload}, options);
    } else {
      createSubject(payload, options);
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Edit Subject' : 'Add Subject'}
        showBack
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="subjectName"
            render={({field: {onChange, value}}) => (
              <Input
                label="Subject Name *"
                placeholder="e.g. Data Structures"
                value={value}
                onChangeText={onChange}
                error={errors.subjectName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="subjectCode"
            render={({field: {onChange, value}}) => (
              <Input
                label="Subject Code"
                placeholder="e.g. CS301"
                value={value ?? ''}
                onChangeText={onChange}
                autoCapitalize="characters"
              />
            )}
          />

          {/* Difficulty selector */}
          <Text style={styles.label}>Difficulty Level</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTY_OPTIONS.map(opt => (
              <Controller
                key={opt.value}
                control={control}
                name="difficultyLevel"
                render={({field: {onChange}}) => (
                  <React.Fragment>
                    <View
                      style={[
                        styles.diffOption,
                        selectedDifficulty === opt.value && {
                          backgroundColor: opt.color + '22',
                          borderColor: opt.color,
                        },
                      ]}>
                      <Button
                        label={opt.label}
                        onPress={() => onChange(opt.value)}
                        variant="ghost"
                        size="sm"
                        textStyle={{color: selectedDifficulty === opt.value ? opt.color : COLORS.TEXT_SECONDARY, fontSize: 12}}
                      />
                    </View>
                  </React.Fragment>
                )}
              />
            ))}
          </View>

          <View style={styles.row}>
            <Controller
              control={control}
              name="credits"
              render={({field: {onChange, value}}) => (
                <Input
                  label="Credits"
                  placeholder="e.g. 4"
                  value={value ?? ''}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
              )}
            />
            <Controller
              control={control}
              name="semester"
              render={({field: {onChange, value}}) => (
                <Input
                  label="Semester"
                  placeholder="e.g. 3"
                  value={value ?? ''}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  containerStyle={styles.halfInput}
                />
              )}
            />
          </View>

          <Button
            label={isEdit ? 'Save Changes' : 'Add Subject'}
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
  difficultyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.XS,
    marginBottom: SPACING.MD,
  },
  diffOption: {
    borderRadius: RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  row: {flexDirection: 'row', gap: SPACING.SM},
  halfInput: {flex: 1},
  submitBtn: {marginTop: SPACING.LG},
});
