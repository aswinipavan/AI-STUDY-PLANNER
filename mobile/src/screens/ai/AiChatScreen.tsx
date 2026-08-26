import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {
  useDailyMotivation,
  useChatHistory,
  useSendChatMessage,
  useClearChatHistory,
} from '@/hooks/useAi';
import {getNewChatSessionId} from '@/api/ai.api';
import type {MessageBubble, ChatHistoryItem} from '@/types/ai.types';
import {getErrorMessage} from '@/utils/errorHandler';


const QUICK_PROMPTS = [
  '💡 Tips for exam preparation',
  '⏱️ How to optimize my study timetable?',
  '📚 Help me understand tough concepts',
  '🎯 How to improve my weak subjects?',
];

export function AiChatScreen() {
  const [sessionId, setSessionId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<MessageBubble[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const {data: motivation} = useDailyMotivation();
  const {data: history, isLoading: historyLoading} = useChatHistory(sessionId);
  const {mutate: sendMessage, isPending: isSending} = useSendChatMessage();
  const {mutate: clearHistory} = useClearChatHistory();

  // Initialize session ID
  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      try {
        const id = await getNewChatSessionId();
        if (isMounted) {
          setSessionId(id);
        }
      } catch {
        if (isMounted) {
          setSessionId(`session-${Date.now()}`);
        }
      }
    }
    initSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync loaded history into local message list
  useEffect(() => {
    if (history && history.length > 0) {
      const formatted: MessageBubble[] = history.map((item: ChatHistoryItem) => ({
        id: item.id,
        role: item.role,
        content: item.message,
        timestamp: item.createdAt,
      }));
      setMessages(formatted);
    }
  }, [history]);

  const handleSend = (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || isSending) return;

    const userMessage: MessageBubble = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');

    sendMessage(
      {
        message: content,
        sessionId: sessionId || undefined,
      },
      {
        onSuccess: (data) => {
          const assistantMessage: MessageBubble = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.reply,
            timestamp: data.timestamp || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        },
        onError: (err) => {
          const errorMessage: MessageBubble = {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Error: ${getErrorMessage(err)}. Please try again.`,
            timestamp: new Date().toISOString(),
            isError: true,
          };
          setMessages((prev) => [...prev, errorMessage]);
        },
      },
    );
  };

  const handleClear = () => {
    if (!sessionId) return;
    Alert.alert('Clear Chat', 'Do you want to reset this conversation?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearHistory(sessionId);
          setMessages([]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="AI Study Tutor"
        subtitle="Ask anything about your syllabus"
        rightElement={
          messages.length > 0 ? (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Daily Motivation Banner */}
        {motivation && (
          <View style={styles.motivationBanner}>
            <Text style={styles.motivationIcon}>✨</Text>
            <Text style={styles.motivationText} numberOfLines={2}>
              {motivation}
            </Text>
          </View>
        )}

        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({animated: true})
          }
          ListEmptyComponent={
            historyLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>Loading tutor session...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🤖</Text>
                <Text style={styles.emptyTitle}>Ask me anything about your studies!</Text>
                <Text style={styles.emptySubtitle}>
                  Get study tips, explanations for tough topics, or exam preparation advice.
                </Text>

                <View style={styles.promptsContainer}>
                  <Text style={styles.promptsTitle}>Suggested Prompts:</Text>
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.promptChip}
                      onPress={() => handleSend(prompt)}>
                      <Text style={styles.promptText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )
          }
          renderItem={({item}) => (
            <View
              style={[
                styles.messageBubble,
                item.role === 'user' ? styles.userBubble : styles.aiBubble,
                item.isError && styles.errorBubble,
              ]}>
              <Text
                style={[
                  styles.messageText,
                  item.role === 'user' ? styles.userText : styles.aiText,
                ]}>
                {item.content}
              </Text>
            </View>
          )}
          ListFooterComponent={
            isSending ? (
              <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.typingText}>Tutor is thinking...</Text>
              </View>
            ) : null
          }
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask your AI Tutor..."
            placeholderTextColor={COLORS.TEXT_MUTED}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isSending}>
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
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
  clearBtn: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
  },
  clearBtnText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  motivationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BG_SURFACE,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BG_BORDER,
    gap: SPACING.SM,
  },
  motivationIcon: {
    fontSize: 18,
  },
  motivationText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  messageList: {
    padding: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XXL,
  },
  loadingText: {
    marginTop: SPACING.SM,
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XL,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: SPACING.SM,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.XS,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.XL,
    lineHeight: 18,
  },
  promptsContainer: {
    width: '100%',
    gap: SPACING.SM,
  },
  promptsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  promptChip: {
    backgroundColor: COLORS.BG_SURFACE,
    borderRadius: RADIUS.MD,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  promptText: {
    fontSize: 13,
    color: COLORS.TEXT_PRIMARY,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM + 2,
    marginBottom: SPACING.SM,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.PRIMARY,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.BG_SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    borderColor: COLORS.DANGER,
    backgroundColor: COLORS.DANGER + '15',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: COLORS.TEXT_PRIMARY,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  typingText: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.BG_SURFACE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BG_BORDER,
    gap: SPACING.SM,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    maxHeight: 100,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
