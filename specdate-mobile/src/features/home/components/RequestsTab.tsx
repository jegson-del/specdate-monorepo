import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SpecService } from '../../../services/specs';
import RequestCard from './RequestCard';

type Props = {
  theme: any;
  bottomNavHeight: number;
  navigation: any;
};

export default function RequestsTab({ theme, bottomNavHeight, navigation }: Props) {
  const queryClient = useQueryClient();
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: SpecService.getPendingRequests,
    refetchInterval: 15000,
  });

  const requests = useMemo(() => data?.data || [], [data]);

  const approveMutation = useMutation({
    mutationFn: ({ specId, applicationId }: { specId: string; applicationId: string }) =>
      SpecService.approveApplication(specId, applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-specs'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ specId, applicationId }: { specId: string; applicationId: string }) =>
      SpecService.rejectApplication(specId, applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
    },
  });

  return (
    <View style={styles.screen}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>Pending Requests</Text>
      <FlatList
        key="requests"
        data={requests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: bottomNavHeight + 24 }}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: theme.colors.outline }}>No pending application requests.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            isProcessing={approveMutation.isPending || rejectMutation.isPending}
            onPress={(request) => navigation.navigate('ProfileViewer', { userId: Number(request.user_id ?? request.user?.id) })}
            onAccept={(sid, appId) => approveMutation.mutate({ specId: sid, applicationId: appId })}
            onReject={(sid, appId) => rejectMutation.mutate({ specId: sid, applicationId: appId })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  empty: {
    paddingTop: 30,
    alignItems: 'center',
  },
});
