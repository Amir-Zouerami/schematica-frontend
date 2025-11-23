import { useSettingsStore } from '@/app/store/useSettingsStore';
import { audioService } from '@/shared/lib/audio-service';
import { useCallback } from 'react';

export const useNotificationSound = () => {
	const { soundEnabled } = useSettingsStore();

	const playNotificationSound = useCallback(() => {
		if (soundEnabled) {
			audioService.play();
		}
	}, [soundEnabled]);

	return { playNotificationSound };
};
