type EventCallback = (data?: any) => void;

class EventEmitter {
  private events: {[key: string]: EventCallback[]} = {};

  public on(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  public off(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  public emit(event: string, data?: any): void {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach(callback => callback(data));
  }
}

// Export a singleton instance
const eventService = new EventEmitter();
export default eventService;
