class AudioService {
	private audio: HTMLAudioElement;
	private isUnlocked: boolean = false;

	constructor() {
		this.audio = new Audio('/sounds/notification.mp3');
		this.audio.volume = 0.5;

		this.audio.preload = 'auto';
		this.audio.load();
	}

	/**
	 * Call this on the first user interaction (click/keydown).
	 * It plays a silent snippet to "bless" the audio element in the browser's eyes.
	 */
	async unlock() {
		if (this.isUnlocked) return;

		try {
			const originalVolume = this.audio.volume;
			this.audio.volume = 0;

			await this.audio.play();

			this.audio.pause();
			this.audio.currentTime = 0;
			this.audio.volume = originalVolume;
			this.isUnlocked = true;
		} catch (e) {
			// This is expected if called programmatically without user gesture.
			// We swallow the error and wait for the next interaction.
			console.debug('Audio unlock pending user interaction...');
		}
	}

	async play() {
		try {
			this.audio.currentTime = 0;
			await this.audio.play();
		} catch (e) {
			console.warn(
				'Notification sound blocked. User has not interacted with the page yet.',
				e,
			);
		}
	}
}

export const audioService = new AudioService();
