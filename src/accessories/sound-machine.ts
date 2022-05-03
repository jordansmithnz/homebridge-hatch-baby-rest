import { hap } from '../hap'
import { filter, map } from 'rxjs/operators'
import { Observable } from 'rxjs'
import { PlatformAccessory } from 'homebridge'
import { BaseAccessory, BaseDevice } from './base-accessory'

export interface SoundMachine extends BaseDevice {
  audioTracks: number[]

  onVolume: Observable<number>
  onAudioPlaying: Observable<boolean>
  onAudioTrack: Observable<number>

  setVolume: (volume: number) => any
  setAudioPlaying: (playing: boolean) => any
  setAudioTrack: (track: number) => any
}

export class SoundMachineAccessory extends BaseAccessory {
  constructor(device: SoundMachine, accessory: PlatformAccessory) {
    super(device, accessory)

    const { Service, Characteristic } = hap,
      speakerService = this.getService(Service.Speaker, 'Volume')

    this.registerCharacteristic(
      speakerService.getCharacteristic(Characteristic.Volume),
      device.onVolume,
      (volume) => device.setVolume(volume)
    )
  }
}
