import { App } from '@capacitor/app';
import type { AppInfo } from '../../application/ports/app-info';

export const androidAppInfo: AppInfo = {
  async getInfo() {
    const { version, build } = await App.getInfo();
    return { version, build };
  },
};
