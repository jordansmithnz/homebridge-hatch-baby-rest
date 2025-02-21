# homebridge-hatch-baby-rest

[![Actions Status](https://github.com/dgreif/homebridge-hatch-baby-rest/workflows/Node%20CI/badge.svg)](https://github.com/dgreif/homebridge-hatch-baby-rest/actions)
[![Donate](https://badgen.net/badge/Donate/PayPal/91BE09)](https://www.paypal.me/dustingreif)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

This homebridge plugin allows you to add the Hatch Rest, Rest+ and Rest Mini, and Restore to HomeKit.  For each device, you are able to control the following:

  * On / Off - Master switch for both light and sound **
  * Brightness and Color **
  * Audio Track - represented as a Fan, with different speed levels mapping to different audio tracks.  For example, 0% is the "None" track, and 100% is the "Rock-a-Bye" track
  * Volume - not available in the Home app, but in some 3rd party HomeKit apps
  * Battery level and firmware version (Rest+ only)

** Rest Mini does not have a light, so only audio controls are available

The Hatch Restore supports much more complicated routines that do not map well to HomeKit controls.  Because of this complexity, the Restore is exposed as a simple switch.  Turning the switch on will initiate the first step in your Bedtime routine.  Turning the switch off will turn the device off no matter which routine/step you are in.

## Easy Setup

For the best experience, install and set up this plugin using [`homebridge-config-ui-x`](https://www.npmjs.com/package/homebridge-config-ui-x).
This provides a user interface in which you can enter your account and light information without modifying your config file manually.

## Manual Installation

```
npm i -g homebridge-hatch-baby-rest
```

### Configuration For Hatch Baby Rest+ (WiFi night light) And Rest Mini

The Rest+ night light and Rest Mini use WiFi to directly interact with Hatch Baby's api.  This allows you to access all of your Rest+/Rest Minis by simply providing your Hatch Baby email/password.

 ```json
{
  "platforms": [
    {
      "platform": "HatchBabyRest",
      "email": "someone@gmail.com",
      "password": "secret password"
    }
  ]
}
```



### Configuration For Hatch Baby Rest (bluetooth night light)

The original Rest night light uses Bluetooth to control the light and change settings.  Because of this restriction, you must create specify the name and mac address for each light that you would like to add to HomeKit.  Please note that this plugin will only be able to connect to the Rest night light if run on a device with Bluetooth LE (version 4+).  This includes the Raspberry Pi 3 b+ and newer, as well as most modern laptops.  Please check your device specifications to ensure it supports Bluetooth LE before trying to run the plugin or opening GitHub issues.

To add a Rest night light to your homebridge setup, first open the Hatch Sleep app on your smartphone or tablet.  In the device settings for your light, find the MAC address.  In the example below, it is `12:34:56:78:90:AB`.

 ```json
{
  "platforms": [
    {
      "platform": "HatchBabyRest",
      "restLights": [
        {
          "name": "Kid's Night Light",
          "macAddress": "12:34:56:78:90:AB"
        }
      ]
    }
  ]
}
```

### Bluetooth on Linux (Raspberry Pi)

If the plugin is unable to connect to your bluetooth Rest and you are running homebridge on a Raspberry Pi
or similar verion of linux, try running the following commands and then restarting homebridge

```
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

## Upgrading from v2 to v3

v3 of the plugin includes new features and some breaking changes.  Please see https://github.com/dgreif/homebridge-hatch-baby-rest/wiki/Upgrading-from-v2-to-v3 for details on what has changed and how to upgrade
