import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAudioPlayer } from 'expo-audio';
import { useUser } from '../../hooks/useUser';
import BottomNav from './components/BottomNav';
import DatesTab from './components/DatesTab';
import HomeFeedTab from './components/HomeFeedTab';
import HomeHeader from './components/HomeHeader';
import MySpecsTab from './components/MySpecsTab';
import RequestsTab from './components/RequestsTab';
import VouchersTab from './components/VouchersTab';
import { BottomTabKey, HomeColors } from './types';
import { ReviewService } from '../../services/reviews';

export default function HomeScreen({ navigation, route }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const player = useAudioPlayer(require('../../../assets/sounds/notification.wav'));
  const bottomNavHeight = 64;
  const [bottomTab, setBottomTab] = useState<BottomTabKey>(
    ['Requests', 'Matches', 'Dates', 'Specs'].includes(route?.params?.initialTab)
      ? route.params.initialTab
      : 'Home'
  );
  const [dismissedPromptId, setDismissedPromptId] = useState<number | null>(null);

  const { data: reviewPromptData } = useQuery({
    queryKey: ['review-prompts'],
    queryFn: ReviewService.getPendingPrompts,
    enabled: Boolean(user?.id && user.role !== 'provider'),
  });
  const reviewPrompt = reviewPromptData?.data?.find((prompt) => Number(prompt.voucher.id) !== dismissedPromptId);
  const dismissReviewPrompt = useMutation({
    mutationFn: (voucherId: number) => ReviewService.dismissPrompt(voucherId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['review-prompts'] }),
  });

  const homeColors = useMemo<HomeColors>(
    () => ({
      bg: theme.colors.background,
      surface: '#FFFFFF',
      text: theme.colors.onBackground,
      subtext: 'rgba(11,11,11,0.62)',
      cardBg: '#FFFFFF',
      cardText: '#0B0B0B',
      cardSubtext: 'rgba(11,11,11,0.78)',
    }),
    [theme.colors.background, theme.colors.onBackground]
  );

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      if (bottomTab === 'Requests') {
        queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      }
      if (bottomTab === 'Matches') {
        queryClient.invalidateQueries({ queryKey: ['dates'] });
      }
      if (bottomTab === 'Dates') {
        queryClient.invalidateQueries({ queryKey: ['date-vouchers'] });
      }
    }, [bottomTab, queryClient])
  );

  React.useEffect(() => {
    if (!user?.id) return;
    const { echo } = require('../../utils/echo');
    const channel = echo.private(`App.Models.User.${user.id}`);

    channel.listen('.NotificationCreated', async (e: any) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      console.log('New notification received!', e);
      player.play();
    });

    return () => {
      channel.stopListening('.NotificationCreated');
    };
  }, [user?.id, queryClient, player]);

  React.useEffect(() => {
    if (route?.params?.initialTab) {
      setBottomTab(route.params.initialTab);
      queryClient.invalidateQueries({ queryKey: route.params.initialTab === 'Requests' ? ['pending-requests'] : route.params.initialTab === 'Matches' ? ['dates'] : ['date-vouchers'] });
    }
  }, [queryClient, route?.params?.initialTab]);

  return (
    <View style={[styles.container, { backgroundColor: homeColors.bg }]}>
      <HomeHeader user={user} insets={insets} theme={theme} navigation={navigation} />

      <View style={styles.content}>
        {bottomTab === 'Home' ? (
          <HomeFeedTab
            theme={theme}
            homeColors={homeColors}
            insets={insets}
            bottomNavHeight={bottomNavHeight}
            navigation={navigation}
          />
        ) : bottomTab === 'Matches' ? (
          <DatesTab
            theme={theme}
            homeColors={homeColors}
            insets={insets}
            bottomNavHeight={bottomNavHeight}
            navigation={navigation}
          />
        ) : bottomTab === 'Dates' ? (
          <VouchersTab
            theme={theme}
            homeColors={homeColors}
            insets={insets}
            bottomNavHeight={bottomNavHeight}
            navigation={navigation}
          />
        ) : bottomTab === 'Specs' ? (
          <MySpecsTab
            theme={theme}
            homeColors={homeColors}
            insets={insets}
            bottomNavHeight={bottomNavHeight}
            navigation={navigation}
          />
        ) : (
          <RequestsTab
            theme={theme}
            bottomNavHeight={bottomNavHeight}
            navigation={navigation}
          />
        )}
      </View>

      <BottomNav
        activeTab={bottomTab}
        onTabChange={setBottomTab}
        onCreate={() => navigation.navigate('CreateSpec')}
        onOpenStatus={() => navigation.navigate('ModerationStatus')}
        user={user}
        theme={theme}
        homeColors={homeColors}
        insets={insets}
      />

      <Portal>
        <Modal
          visible={Boolean(reviewPrompt)}
          onDismiss={() => reviewPrompt && setDismissedPromptId(Number(reviewPrompt.voucher.id))}
          contentContainerStyle={[styles.reviewPrompt, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.reviewPromptTitle, { color: theme.colors.onSurface }]}>How was your date?</Text>
          <Text style={[styles.reviewPromptText, { color: theme.colors.onSurfaceVariant }]}>
            {reviewPrompt?.provider.name || 'Your provider'} confirmed your visit. Review the venue and your date experience when you have a moment.
          </Text>
          <View style={styles.reviewPromptActions}>
            <Button
              mode="outlined"
              onPress={() => {
                if (!reviewPrompt) return;
                dismissReviewPrompt.mutate(Number(reviewPrompt.voucher.id));
                setDismissedPromptId(Number(reviewPrompt.voucher.id));
              }}
              style={styles.reviewPromptButton}
            >
              Disregard
            </Button>
            <Button
              mode="contained"
              onPress={() => reviewPrompt && navigation.navigate('PostDateReview', { voucherId: reviewPrompt.voucher.id })}
              style={styles.reviewPromptButton}
            >
              Review now
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  reviewPrompt: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    gap: 12,
  },
  reviewPromptTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  reviewPromptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  reviewPromptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  reviewPromptButton: {
    flex: 1,
    borderRadius: 12,
  },
});
