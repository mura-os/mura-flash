import { Adb, AdbDaemonTransport } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import {
  AdbDaemonWebUsbDevice,
  AdbDaemonWebUsbDeviceManager,
} from "@yume-chan/adb-daemon-webusb";

import { fail } from "./errors";
import type { DeviceIdentity, ProbeAdapter } from "./types";
import { FastbootDevice } from "./vendor-fastboot";

const fastbootFilter: USBDeviceFilter = {
  classCode: 0xff,
  subclassCode: 0x42,
  protocolCode: 0x03,
};

const encoder = new TextEncoder();

const adbProperties: Readonly<Record<string, string>> = {
  "boot-devices": "ro.boot.boot_devices",
  "build-fingerprint": "ro.build.fingerprint",
  "build-id": "ro.build.id",
  "build-incremental": "ro.build.version.incremental",
  device: "ro.product.device",
  "flash-locked": "ro.boot.flash.locked",
  "hardware-sku": "ro.boot.hardware.sku",
  manufacturer: "ro.product.manufacturer",
  model: "ro.product.model",
  "security-patch": "ro.build.version.security_patch",
  "slot-suffix": "ro.boot.slot_suffix",
  "vbmeta-device-state": "ro.boot.vbmeta.device_state",
  "vbmeta-digest": "ro.boot.vbmeta.digest",
  "verified-boot-state": "ro.boot.verifiedbootstate",
};

const fastbootVariables: Readonly<Record<string, string>> = {
  "battery-soc-ok": "battery-soc-ok",
  "bootloader-version": "version-bootloader",
  "current-slot": "current-slot",
  "hardware-revision": "hw-revision",
  "is-userspace": "is-userspace",
  "max-download-size": "max-download-size",
  product: "product",
  secure: "secure",
  "slot-count": "slot-count",
  "snapshot-status": "snapshot-update-status",
  "super-partition-name": "super-partition-name",
  unlocked: "unlocked",
  variant: "variant",
};

function identityOf(device: USBDevice, backendSerial?: string): DeviceIdentity {
  const result: {
    serial?: string;
    vendorId: number;
    productId: number;
  } = {
    vendorId: device.vendorId,
    productId: device.productId,
  };
  if (device.serialNumber !== null && device.serialNumber.length > 0) {
    result.serial = device.serialNumber;
  } else if (backendSerial !== undefined && backendSerial.length > 0) {
    result.serial = backendSerial;
  }
  return result;
}

function requireStableSerial(identity: DeviceIdentity, transport: string): string {
  if (identity.serial === undefined || identity.serial.length === 0) {
    throw fail(
      "safety-refusal",
      `${transport} connection requires a stable device serial`,
    );
  }
  return identity.serial;
}

function sameIdentity(left: DeviceIdentity, right: DeviceIdentity): boolean {
  return (
    left.serial === right.serial &&
    left.vendorId === right.vendorId &&
    left.productId === right.productId
  );
}

function checkFactSize(
  value: string | null,
  maxBytes: number,
  transport: string,
): string | null {
  if (value !== null && encoder.encode(value).byteLength > maxBytes) {
    throw fail(
      "safety-refusal",
      `${transport} fact exceeds the remaining output budget`,
    );
  }
  return value;
}

export class TangoAdbProbeAdapter implements ProbeAdapter {
  readonly kind = "adb" as const;
  readonly #manager: AdbDaemonWebUsbDeviceManager;
  #backends: AdbDaemonWebUsbDevice[] = [];
  #adb: Adb | undefined;
  #closed = false;

  constructor() {
    const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
    if (manager === undefined) {
      throw fail("safety-refusal", "WebUSB is unavailable");
    }
    if (
      typeof globalThis.indexedDB === "undefined" ||
      globalThis.crypto?.subtle === undefined
    ) {
      throw fail(
        "safety-refusal",
        "browser credential storage is unavailable",
      );
    }
    this.#manager = manager;
  }

  async listDevices(): Promise<readonly DeviceIdentity[]> {
    if (this.#closed) {
      throw fail("usage", "ADB adapter is closed");
    }
    this.#backends = await this.#manager.getDevices();
    if (this.#backends.length === 0) {
      const selected = await this.#manager.requestDevice();
      if (selected !== undefined) {
        this.#backends = [selected];
      }
    }
    return this.#backends.map((backend) =>
      identityOf(backend.raw, backend.serial),
    );
  }

  async connect(identity: DeviceIdentity): Promise<DeviceIdentity> {
    const selectedSerial = requireStableSerial(identity, "ADB");
    const backend = this.#backends.find((candidate) =>
      sameIdentity(identityOf(candidate.raw, candidate.serial), identity),
    );
    if (backend === undefined) {
      throw fail("device-missing", "selected ADB device disconnected");
    }
    if (
      requireStableSerial(identityOf(backend.raw, backend.serial), "ADB") !==
      selectedSerial
    ) {
      throw fail("safety-refusal", "ADB selected a different device");
    }
    const connection = await backend.connect();
    const transport = await AdbDaemonTransport.authenticate({
      serial: backend.serial,
      connection,
      credentialStore: new AdbWebCredentialStore("Mura Flash"),
    });
    this.#adb = new Adb(transport);
    const connected = identityOf(backend.raw, backend.serial);
    if (requireStableSerial(connected, "ADB") !== selectedSerial) {
      await this.close();
      throw fail("safety-refusal", "ADB connected a different device");
    }
    return connected;
  }

  async readFact(
    fact: string,
    signal: AbortSignal,
    maxBytes: number,
  ): Promise<string | null> {
    signal.throwIfAborted();
    const property = adbProperties[fact];
    if (property === undefined) {
      throw fail("safety-refusal", `ADB fact ${JSON.stringify(fact)} is denied`);
    }
    if (this.#adb === undefined) {
      throw fail("device-missing", "ADB device is not connected");
    }
    // Tango exposes a fixed single-property operation, not a byte-limited
    // stream. Check abort and encoded size around that bounded response.
    const value = await this.#adb.getProp(property);
    signal.throwIfAborted();
    if (this.#closed) {
      throw fail("probe-failed", "ADB adapter closed during probe");
    }
    return checkFactSize(value.length === 0 ? null : value, maxBytes, "ADB");
  }

  async close(): Promise<void> {
    this.#closed = true;
    const adb = this.#adb;
    this.#adb = undefined;
    if (adb !== undefined) {
      await adb.close();
    }
  }
}

export class GrapheneFastbootProbeAdapter implements ProbeAdapter {
  readonly kind = "fastboot" as const;
  readonly #device = new FastbootDevice();
  #devices: USBDevice[] = [];
  #closed = false;

  async listDevices(): Promise<readonly DeviceIdentity[]> {
    if (this.#closed) {
      throw fail("usage", "fastboot adapter is closed");
    }
    if (globalThis.navigator?.usb === undefined) {
      throw fail("safety-refusal", "WebUSB is unavailable");
    }
    this.#devices = (await globalThis.navigator.usb.getDevices()).filter(
      (device) =>
        device.configurations.some((configuration) =>
          configuration.interfaces.some((interface_) =>
            interface_.alternates.some(
              (alternate) =>
                alternate.interfaceClass === fastbootFilter.classCode &&
                alternate.interfaceSubclass === fastbootFilter.subclassCode &&
                alternate.interfaceProtocol === fastbootFilter.protocolCode,
            ),
          ),
        ),
    );
    if (this.#devices.length === 0) {
      try {
        this.#devices = [
          await globalThis.navigator.usb.requestDevice({
            filters: [fastbootFilter],
          }),
        ];
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") {
          return [];
        }
        throw error;
      }
    }
    return this.#devices.map((device) => identityOf(device));
  }

  async connect(identity: DeviceIdentity): Promise<DeviceIdentity> {
    const selectedSerial = requireStableSerial(identity, "fastboot");
    if (
      !this.#devices.some((device) =>
        sameIdentity(identityOf(device), identity),
      )
    ) {
      throw fail("device-missing", "selected fastboot device disconnected");
    }
    await this.#device.connect();
    if (this.#device.device === null) {
      throw fail("device-missing", "fastboot connection did not select a device");
    }
    const connected = identityOf(this.#device.device);
    if (requireStableSerial(connected, "fastboot") !== selectedSerial) {
      await this.close();
      throw fail("safety-refusal", "fastboot connected a different device");
    }
    return connected;
  }

  async readFact(
    fact: string,
    signal: AbortSignal,
    maxBytes: number,
  ): Promise<string | null> {
    signal.throwIfAborted();
    if (this.#closed) {
      throw fail("probe-failed", "fastboot adapter is closed");
    }
    const variable = fastbootVariables[fact];
    if (variable === undefined) {
      throw fail(
        "safety-refusal",
        `fastboot fact ${JSON.stringify(fact)} is denied`,
      );
    }
    // The pinned API exposes one fixed getvar response and no abortable or
    // byte-limited stream. Closing on timeout plus these pre/post checks
    // prevents a late response from being used by the session.
    const value = await this.#device.getVariable(variable);
    signal.throwIfAborted();
    if (this.#closed) {
      throw fail("probe-failed", "fastboot adapter closed during probe");
    }
    return checkFactSize(value, maxBytes, "fastboot");
  }

  async close(): Promise<void> {
    this.#closed = true;
    const device = this.#device.device;
    if (device?.opened === true) {
      await device.close();
    }
  }
}
