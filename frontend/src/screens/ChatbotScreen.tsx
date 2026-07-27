import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Message = { id: number; from: 'bot' | 'user'; text: string };

export default function ChatbotScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([{ id: 1, from: 'bot', text: '안녕하세요! 저는 아낄지도 AI예요 🌱\n비에 대해 무엇이든 물어보세요!' }]);
  const send = (text = input) => { if (!text.trim()) return; setMessages((prev) => [...prev, { id: Date.now(), from: 'user', text }]); setInput(''); };
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}><Text style={styles.mascot}>🗺️</Text><Text style={styles.heading}>AI 챗봇</Text></View>
      <ScrollView contentContainerStyle={styles.messages}>
        {messages.map((message) => <View key={message.id} style={message.from === 'bot' ? styles.botRow : styles.userRow}><View style={message.from === 'bot' ? styles.botBubble : styles.userBubble}><Text style={message.from === 'bot' ? styles.botText : styles.userText}>{message.text}</Text></View></View>)}
        <View style={styles.suggestions}>{['내 주변에서 가장 많이 쓴 가게는 어디야?', '이번 달 소비가 가장 많은 가게는 어디야?', '지출 평균과 비교해줘'].map((item) => <Pressable key={item} style={styles.suggestion} onPress={() => send(item)}><Text style={styles.suggestionText}>{item}</Text></Pressable>)}</View>
      </ScrollView>
      <View style={styles.inputBar}><TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="질문을 입력하세요..." placeholderTextColor="#819087" onSubmitEditing={() => send()} /><Pressable style={styles.send} onPress={() => send()}><Text style={styles.sendText}>➤</Text></Pressable></View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9F8', paddingTop: 22 }, header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E1E9E4' }, mascot: { fontSize: 26, marginRight: 8 }, heading: { fontSize: 15, fontWeight: '900', color: '#18251E' }, messages: { padding: 16, gap: 11 }, botRow: { alignItems: 'flex-start' }, userRow: { alignItems: 'flex-end' }, botBubble: { maxWidth: '80%', padding: 12, borderRadius: 15, borderTopLeftRadius: 4, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E1E9E4' }, userBubble: { maxWidth: '84%', padding: 11, borderRadius: 15, borderTopRightRadius: 4, backgroundColor: '#268351' }, botText: { color: '#18251E', fontSize: 12, lineHeight: 18 }, userText: { color: '#FFF', fontSize: 11 }, suggestions: { gap: 8, marginTop: 8 }, suggestion: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: '#268351' }, suggestionText: { color: '#FFF', fontSize: 10 }, inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E1E9E4' }, input: { flex: 1, height: 42, borderRadius: 15, paddingHorizontal: 14, backgroundColor: '#EAF5EF', fontSize: 12, color: '#18251E' }, send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8BC7A4' }, sendText: { color: '#FFF', fontSize: 15 },
});
