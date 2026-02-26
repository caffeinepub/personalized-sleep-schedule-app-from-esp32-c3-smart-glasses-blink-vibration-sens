export interface QueuedBlinkRate {
  deviceId: string;
  blinkRate: number;
  timestamp: number;
  id: string;
}

const QUEUE_KEY = 'ble-write-queue';

export function enqueueBlinkRate(deviceId: string, blinkRate: number): void {
  try {
    const queue = getQueue();
    const item: QueuedBlinkRate = {
      deviceId,
      blinkRate,
      timestamp: Date.now(),
      id: `${deviceId}-${Date.now()}-${Math.random()}`,
    };
    queue.push(item);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to enqueue blink rate:', error);
  }
}

export function getQueue(): QueuedBlinkRate[] {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read queue:', error);
    return [];
  }
}

export function removeFromQueue(id: string): void {
  try {
    const queue = getQueue();
    const filtered = queue.filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove from queue:', error);
  }
}

export function clearQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch (error) {
    console.error('Failed to clear queue:', error);
  }
}
