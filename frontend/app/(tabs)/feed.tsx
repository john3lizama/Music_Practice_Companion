import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Background } from '../../src/components/Background';
import { GlassCard, H1, Muted, SectionLabel, Avatar } from '../../src/components/ui';
import { colors, gradients, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { listPerformances, toggleLike } from '../../src/api';
import type { Performance } from '../../src/mockData';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Feed() {
  const router = useRouter();
  const [items, setItems] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPerformances().then((res) => {
      setItems(res);
      setLoading(false);
    });
  }, []);

  const onLike = async (perf: Performance) => {
    const nextLiked = !perf.liked;
    setItems((prev) =>
      prev.map((p) =>
        p.id === perf.id ? { ...p, liked: nextLiked, likes: p.likes + (nextLiked ? 1 : -1) } : p,
      ),
    );
    await toggleLike(perf.id, nextLiked);
  };

  return (
    <Background testID="feed-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <SectionLabel>Community · Preview</SectionLabel>
        <H1 style={{ marginTop: spacing.xs }}>Performance feed</H1>
        <Muted style={{ marginTop: spacing.xs }}>A preview of the social layer — these are sample performances. Sharing your own takes is coming soon.</Muted>

        {loading ? (
          <View style={styles.loading} testID="feed-loading">
            <ActivityIndicator color={colors.primaryBright} />
          </View>
        ) : (
          <View style={{ marginTop: spacing.xl }} testID="feed-list">
            {items.map((p) => (
              <GlassCard key={p.id} style={styles.post} testID={`post-${p.id}`}>
                {/* Header */}
                <View style={styles.postHeader}>
                  <Avatar gradient={p.user.avatarGradient} label={p.user.name[0]} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.postName}>{p.user.name}</Text>
                    <Text style={styles.postHandle}>{p.user.handle} · {timeAgo(p.postedAt)}</Text>
                  </View>
                  <View style={styles.scorePill}>
                    <Text style={styles.scorePillText}>{p.overallScore}</Text>
                  </View>
                </View>

                {/* Caption */}
                <Text style={styles.caption}>{p.caption}</Text>

                {/* Song chip */}
                <Pressable testID={`post-song-${p.id}`} onPress={() => router.push(`/song/${p.songId}`)}>
                  <LinearGradient colors={gradients.card as unknown as string[]} style={styles.songChip}>
                    <Ionicons name="musical-note" size={16} color={colors.primaryBright} />
                    <Text style={styles.songChipText}>{p.songTitle} · {p.artist}</Text>
                    <View style={styles.instrTag}>
                      <Text style={styles.instrTagText}>{p.instrument}</Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                {/* Actions */}
                <View style={styles.postActions}>
                  <Pressable testID={`like-${p.id}`} onPress={() => onLike(p)} style={styles.actionBtn}>
                    <Ionicons name={p.liked ? 'heart' : 'heart-outline'} size={20} color={p.liked ? colors.danger : colors.textMuted} />
                    <Text style={[styles.actionText, p.liked && { color: colors.danger }]} testID={`likes-${p.id}`}>{p.likes}</Text>
                  </Pressable>
                  <View style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={19} color={colors.textMuted} />
                    <Text style={styles.actionText}>{p.comments}</Text>
                  </View>
                  <View style={styles.actionBtn}>
                    <Ionicons name="share-social-outline" size={19} color={colors.textMuted} />
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: spacing.huge },
  post: { marginBottom: spacing.lg, padding: spacing.lg },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  postName: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  postHandle: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  scorePill: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.borderStrong },
  scorePillText: { color: colors.primaryBright, fontSize: fontSize.md, fontWeight: fontWeight.heavy },
  caption: { color: colors.text, fontSize: fontSize.md, lineHeight: 22, marginTop: spacing.md },
  songChip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  songChipText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },
  instrTag: { backgroundColor: colors.surfaceStrong, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  instrTagText: { color: colors.textMuted, fontSize: fontSize.xs },
  postActions: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
