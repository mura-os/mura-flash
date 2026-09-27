"""Compiled-in read-only probe allowlists."""

from __future__ import annotations

from types import MappingProxyType
from typing import Final

ADB_GETPROP: Final = MappingProxyType(
    {
        "adb.boot-devices": "ro.boot.boot_devices",
        "adb.build-fingerprint": "ro.build.fingerprint",
        "adb.build-id": "ro.build.id",
        "adb.build-incremental": "ro.build.version.incremental",
        "adb.device": "ro.product.device",
        "adb.flash-locked": "ro.boot.flash.locked",
        "adb.hardware-sku": "ro.boot.hardware.sku",
        "adb.manufacturer": "ro.product.manufacturer",
        "adb.model": "ro.product.model",
        "adb.security-patch": "ro.build.version.security_patch",
        "adb.slot-suffix": "ro.boot.slot_suffix",
        "adb.vbmeta-device-state": "ro.boot.vbmeta.device_state",
        "adb.vbmeta-digest": "ro.boot.vbmeta.digest",
        "adb.verified-boot-state": "ro.boot.verifiedbootstate",
    }
)

FASTBOOT_GETVAR: Final = MappingProxyType(
    {
        "fastboot.battery-soc-ok": "battery-soc-ok",
        "fastboot.bootloader-version": "version-bootloader",
        "fastboot.current-slot": "current-slot",
        "fastboot.hardware-revision": "hw-revision",
        "fastboot.is-userspace": "is-userspace",
        "fastboot.max-download-size": "max-download-size",
        "fastboot.product": "product",
        "fastboot.secure": "secure",
        "fastboot.slot-count": "slot-count",
        "fastboot.snapshot-status": "snapshot-update-status",
        "fastboot.super-partition-name": "super-partition-name",
        "fastboot.unlocked": "unlocked",
        "fastboot.variant": "variant",
    }
)

ALLOWED_GETPROPS: Final = frozenset(ADB_GETPROP.values())
ALLOWED_GETVARS: Final = frozenset(FASTBOOT_GETVAR.values())
