# Older changes
## 0.4.2 (2025-11-08)

- update dependencies
- fix device name / model identifier in the objects

## 0.4.1 (2025-11-07)

- fix logging
- fix connection state

## 0.4.0 (2025-11-02)

- Updated translations for datapoint descriptions in all supported languages
- Refreshed and modernized the admin UI: clearer sections, manual IP address list, Windows hint, and option to disable auto-discovery
- Possibility to manually add devices via IP-Address and Option to disable auto discovery
- Save auto discovered devices in info datapoint and show in admin UI

## 0.3.1 (2025-10-19)

- Refactored: Moved all device logic to a dedicated GoveeService class, modularized utilities
- Improved test coverage
- Dependencies updated

## 0.2.9 (2025-08-22)

- update dependencies
- add support for node 24
- update to ESlint 9

## 0.2.8 (2025-03-28)

- update dependencies
- avoid repeated overriding of states

## 0.2.7 (2024-08-18)

- update core dependencies and min required node version to 18

## 0.2.6 (2024-02-06)

- fix brightness change also changing white temperature

## 0.2.5 (2024-01-13)

- create only one socket, as the second seems not to be necessary
- refactoring the code for better structure
- possibility to choose listen interface in settings

## 0.2.4 (2024-01-05)

- fix access

## 0.2.2 (2024-01-05)

- fix color temperature message

## 0.2.1 (2023-12-24)

- repair onOff / all other actions Fixes: [#65](https://github.com/boergegrunicke/ioBroker.govee-local/issues/65)
- fix log spamming because of wildcard

## 0.2.0 (2023-12-17)

- support controlling the color
- extended logging mode

## 0.1.2 (2023-09-06)

- change icon path and resolution

## 0.1.1 (2023-08-21)

- fix image

## 0.1.0 (2023-08-09)

- make search intervals configurable
- clear all timeouts, when adapter is stopped
- replace forbidden characters in names
- update translations
- update dependencies

## 0.0.6 (2023-05-18)

- update dependencies

## 0.0.5 (2023-04-02)

- make pipeline run

## 0.0.4 (2023-04-02)

- make device status refresh independent from device search interval

## 0.0.3 (2023-04-01)

- update dependencies

## 0.0.2

- frequently searching for devices and requesting their specific state
- on / off state, brightness and and color temperature can be controlled

[Older changelogs can be found there](CHANGELOG_OLD.md)
