type EventHandler = (data?: any) => void;

/**
 * A simple, global event bus for decoupled communication between different parts of the application.
 * This allows the globally-scoped QueryClient to notify React components of events without
 * creating a direct dependency.
 */
class EventBus {
	private events: Record<string, EventHandler[]> = {};

	/**
	 * Subscribes to an event.
	 * @param event The name of the event.
	 * @param callback The function to execute when the event is dispatched.
	 */
	public on(event: string, callback: EventHandler): void {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);
	}

	/**
	 * Unsubscribes from an event.
	 * @param event The name of the event.
	 * @param callback The callback function to remove.
	 */
	public off(event: string, callback: EventHandler): void {
		if (!this.events[event]) {
			return;
		}
		this.events[event] = this.events[event].filter((cb) => cb !== callback);
	}

	/**
	 * Dispatches an event, calling all subscribed callbacks.
	 * @param event The name of the event to dispatch.
	 * @param data Optional data to pass to the event handlers.
	 */
	public dispatch(event: string, data?: any): void {
		if (!this.events[event]) {
			return;
		}
		this.events[event].forEach((callback) => callback(data));
	}
}

// A singleton instance of the EventBus for the entire application.
export const appEventBus = new EventBus();

// A centralized object for defining event names to prevent typos.
export const AppEvents = {
	API_UNAUTHORIZED: 'onApiError401',
};
