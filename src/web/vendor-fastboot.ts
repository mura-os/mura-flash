// The pinned vendor bundle has no declaration file.
// @ts-expect-error -- runtime code is supplied by vendor/fastboot.js.
import { FastbootDevice as VendorFastbootDevice } from "../../vendor/fastboot.js/dist/fastboot.mjs";

interface FastbootDeviceInstance {
  device: USBDevice | null;
  connect(): Promise<void>;
  getVariable(name: string): Promise<string | null>;
}

export const FastbootDevice = VendorFastbootDevice as {
  new (): FastbootDeviceInstance;
};
