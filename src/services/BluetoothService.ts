/**
 * BluetoothService.ts
 *
 * FIX 1: Replaced Node.js `EventEmitter` (not available in RN) with a
 *         custom lightweight implementation.
 *
 * FIX 2: `off()` method added so callers can unsubscribe specific callbacks
 *         instead of calling `removeAllListeners()` which wiped ALL screens.
 *
 * FIX 3: Buffer + frame parsing unchanged — logic was correct.
 *         Added overflow guard (MAX_FRAMES_PER_GESTURE).
 */

import RNBluetoothClassic, {
  BluetoothDevice,
} from 'react-native-bluetooth-classic';
import { CONFIG } from '../config';
import { BTEventName, SensorFrame } from '../types';
import { logger } from '../utils/logger';

// ─── Minimal EventEmitter (no Node.js dependency) ─────────────────────────────
// Analogy to ESP32: this is like a simple pub/sub system.
// Screens "subscribe" (on), and this service "publishes" (emit) events.
type Listener = (...args: any[]) => void;

class MiniEmitter {
  private _listeners: Partial<Record<BTEventName, Listener[]>> = {};

  on(event: BTEventName, cb: Listener): void {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event]!.push(cb);
    logger.debug('BT:Emitter', `on('${event}') — total: ${this._listeners[event]!.length}`);
  }

  // FIX: Remove only ONE specific callback, not all listeners for the event
  off(event: BTEventName, cb: Listener): void {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event]!.filter(l => l !== cb);
    logger.debug('BT:Emitter', `off('${event}') — remaining: ${this._listeners[event]!.length}`);
  }

  // Keep for compatibility but now only clears the specified event (or all if none given)
  removeAllListeners(event?: BTEventName): void {
    if (event) {
      this._listeners[event] = [];
    } else {
      this._listeners = {};
    }
  }

  protected emit(event: BTEventName, ...args: any[]): void {
    const cbs = this._listeners[event];
    if (!cbs || cbs.length === 0) return;
    cbs.forEach(cb => {
      try {
        cb(...args);
      } catch (e) {
        logger.error('BT:Emitter', `Listener for '${event}' threw`, e);
      }
    });
  }
}

// ─── BluetoothService ─────────────────────────────────────────────────────────
class BluetoothService extends MiniEmitter {
  private connectedDevice: BluetoothDevice | null = null;
  private readSubscription: any = null;
  private disconnectSubscription: any = null;

  // Stream buffer — accumulates raw BT chunks until we have full lines
  // Analogy to ESP32: like a UART ring buffer before processing
  private rxBuffer: string = '';

  // Gesture buffer — collects parsed frames until 'END' arrives
  private gestureFrames: SensorFrame[] = [];

  // ── Public API ──────────────────────────────────────────────────────────────

  async scanAndConnect(targetName: string = CONFIG.BT_DEVICE_NAME): Promise<BluetoothDevice> {
    logger.info('BT', `Scanning for "${targetName}"...`);

    const paired = await RNBluetoothClassic.getBondedDevices();
    logger.debug('BT', `Paired devices: ${paired.map(d => d.name).join(', ')}`);

    const device = paired.find(d => d.name === targetName);
    if (!device) {
      throw new Error(
        `Device "${targetName}" not found in paired devices. ` +
        'Please pair it in Android Bluetooth settings first.',
      );
    }

    logger.info('BT', `Connecting to ${device.name} (${device.address})...`);
    const connected = await device.connect({ delimiter: '\n', charset: 'utf-8' });

    if (!connected) {
      throw new Error('Connection returned false. Device may be busy or out of range.');
    }

    this.connectedDevice = device;
    this.rxBuffer = '';
    this.gestureFrames = [];

    this.startListening();
    this.watchForDisconnect();

    logger.info('BT', 'Connected successfully');
    this.emit('connected', { name: device.name, address: device.address });

    return device;
  }

  async disconnect(): Promise<void> {
    this.cleanupSubscriptions();
    if (this.connectedDevice) {
      await this.connectedDevice.disconnect().catch(() => {});
      this.connectedDevice = null;
    }
    this.rxBuffer = '';
    this.gestureFrames = [];
    this.emit('disconnected');
    logger.info('BT', 'Disconnected');
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private startListening(): void {
    if (!this.connectedDevice) return;

    this.readSubscription = this.connectedDevice.onDataReceived(event => {
      // event.data is a string chunk — may be partial, may contain multiple lines
      logger.debug('BT:RX', `chunk(${event.data.length}): "${event.data.replace(/\n/g, '\\n')}"`);
      this.handleChunk(event.data);
    });
  }

  private watchForDisconnect(): void {
    this.disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected(event => {
      // Only react if it's OUR device
      if (event?.device?.address === this.connectedDevice?.address) {
        logger.warn('BT', 'Device disconnected unexpectedly');
        this.handleUnexpectedDisconnect();
      }
    });
  }

  private handleUnexpectedDisconnect(): void {
    this.cleanupSubscriptions();
    this.connectedDevice = null;
    this.rxBuffer = '';
    this.gestureFrames = [];
    this.emit('disconnected');
  }

  private cleanupSubscriptions(): void {
    this.readSubscription?.remove();
    this.disconnectSubscription?.remove();
    this.readSubscription = null;
    this.disconnectSubscription = null;
  }

  /**
   * Core buffering logic.
   *
   * Problem: BT sends raw bytes in arbitrary chunks.
   * A "line" of CSV data may arrive split across multiple chunks:
   *   chunk1: "1.23,4.56,7.8"
   *   chunk2: "9,...,18.0\nEND\n"
   *
   * Solution: accumulate in rxBuffer, split on '\n', keep last partial piece.
   *
   * Analogy to ESP32: same as reading UART byte-by-byte into a buffer
   * and only processing when you see '\n'.
   */
  private handleChunk(chunk: string): void {
    this.rxBuffer += chunk;

    // Split by newline — last element is either '' or an incomplete line
    const lines = this.rxBuffer.split('\n');

    // Everything after the last \n stays in buffer for next chunk
    this.rxBuffer = lines.pop() ?? '';

    for (const raw of lines) {
      const line = raw.trim().replace(/\r/g, ''); // remove \r for Windows-style \r\n
      if (line.length > 0) {
        this.processLine(line);
      }
    }
  }

  private processLine(line: string): void {
    if (line === 'END') {
      this.finalizeGesture();
      return;
    }

    const frame = this.parseCSVFrame(line);
    if (!frame) return; // error already logged inside parseCSVFrame

    // Overflow guard — if ESP32 never sends END for some reason
    if (this.gestureFrames.length >= CONFIG.MAX_FRAMES_PER_GESTURE) {
      logger.warn('BT', `Overflow: ${CONFIG.MAX_FRAMES_PER_GESTURE} frames without END — auto-finalizing`);
      this.finalizeGesture();
    }

    this.gestureFrames.push(frame);
    this.emit('frame', frame); // live data for UI
  }

  private parseCSVFrame(line: string): SensorFrame | null {
    const parts = line.split(',');

    if (parts.length !== 18) {
      logger.warn('BT:Parser', `Bad frame: expected 18 values, got ${parts.length} | "${line}"`);
      return null;
    }

    const values = parts.map(Number);

    if (values.some(isNaN)) {
      logger.warn('BT:Parser', `NaN in frame: "${line}"`);
      return null;
    }

    return values;
  }

  private finalizeGesture(): void {
    if (this.gestureFrames.length === 0) {
      logger.warn('BT', 'END received but gesture buffer is empty — ignoring');
      return;
    }

    const frames = [...this.gestureFrames]; // copy before clearing
    this.gestureFrames = [];

    logger.info('BT', `Gesture complete: ${frames.length} frames`);
    this.emit('gestureComplete', frames);
  }
}

// Singleton — one instance for the whole app lifetime
export default new BluetoothService();
