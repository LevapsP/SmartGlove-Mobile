import notifee, { AndroidImportance, AndroidColor } from '@notifee/react-native';

class NotificationService {
  private channelId: string | null = null;

  async setup() {
    this.channelId = await notifee.createChannel({
      id: 'smartglove',
      name: 'SmartGlove',
      importance: AndroidImportance.HIGH,
    });
  }

  async showSuccess(title: string, body: string) {
    if (!this.channelId) await this.setup();
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: this.channelId!,
        color: '#4ADE80',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });
  }

  async showError(title: string, body: string) {
    if (!this.channelId) await this.setup();
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: this.channelId!,
        color: '#EF4444',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });
  }
}

export default new NotificationService();