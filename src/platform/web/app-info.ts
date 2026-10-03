import type { AppInfo } from '../../application/ports/app-info';

export const webAppInfo: AppInfo = {
  getInfo: () => Promise.resolve({ version: __APP_VERSION__, build: __APP_COMMIT__ }),
};
