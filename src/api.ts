import { apiPath, EmailAuth, requestWithRetry, RestClient } from './rest-client'
import {
  IotCredentialsResponse,
  IotTokenResponse,
  MemberResponse,
  IotDeviceInfo,
} from './hatch-sleep-types'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { logDebug, logError, logInfo } from './util'
import { RestPlus } from './rest-plus'
import { RestMini } from './rest-mini'
import { Restore } from './restore'
import { BehaviorSubject } from 'rxjs'
import { IotDevice } from './iot-device'
import { debounceTime } from 'rxjs/operators'

export interface ApiConfig extends EmailAuth {}

const productMap = {
    restPlus: RestPlus,
    restMini: RestMini,
    restore: Restore,
  },
  knownProducts = Object.keys(productMap),
  productFetchQueryString = knownProducts
    .map((product) => 'iotProducts=' + product)
    .join('&'),
  iotClientRefreshPeriod = 8 * 60 * 60 * 1000 // refresh client every 8 hours

export class HatchBabyApi {
  restClient = new RestClient(this.config)
  constructor(private config: ApiConfig) {}

  getAccount() {
    return this.restClient.getAccount()
  }

  getMember() {
    return this.restClient.request<MemberResponse>({
      url: apiPath('service/app/v2/member'),
    })
  }

  async getIotDevices() {
    const devices =
      (await this.restClient.request<IotDeviceInfo[] | null>({
        url: apiPath(
          'service/app/iotDevice/v2/fetch?' + productFetchQueryString
        ),
      })) || []

    devices.forEach((device) => {
      if (!knownProducts.includes(device.product)) {
        logInfo('Unsupported Light Found: ' + JSON.stringify(device))
      }
    })

    return devices
  }

  async createAwsIotClient() {
    const iotResponse = await this.restClient.request<IotTokenResponse>({
        url: apiPath('service/app/restPlus/token/v1/fetch'),
      }),
      { Credentials: credentials } =
        await requestWithRetry<IotCredentialsResponse>({
          url: `https://cognito-identity.${iotResponse.region}.amazonaws.com`,
          method: 'POST',
          headers: {
            'content-type': 'application/x-amz-json-1.1',
            'X-Amz-Target':
              'AWSCognitoIdentityService.GetCredentialsForIdentity',
          },
          json: {
            IdentityId: iotResponse.identityId,
            Logins: {
              'cognito-identity.amazonaws.com': iotResponse.token,
            },
          },
        }),
      mqttClient = new AwsIotDevice({
        protocol: 'wss',
        host: iotResponse.endpoint.replace('https://', ''),
        accessKeyId: credentials.AccessKeyId,
        secretKey: credentials.SecretKey,
        sessionToken: credentials.SessionToken,
      })

    return mqttClient
  }

  async getOnIotClient() {
    // eslint-disable-next-line prefer-const
    let onIotClient: BehaviorSubject<AwsIotDevice> | undefined

    const createNewIotClient = async (): Promise<AwsIotDevice> => {
      try {
        // eslint-disable-next-line no-use-before-define
        const previousMqttClient = onIotClient?.getValue()
        if (previousMqttClient) {
          try {
            previousMqttClient.end()
          } catch (e: unknown) {
            logError('Failed to end previous MQTT Client')
            logError(e)
          }
        }

        logDebug('Creating new MQTT Client')

        const mqttClient = await this.createAwsIotClient()

        mqttClient.on('error', async (error) => {
          if (error.message.includes('(403)')) {
            logError('MQTT Client No Longer Authorized')
          } else {
            logError('MQTT Error:')
            logError(error)
          }

          try {
            // eslint-disable-next-line no-use-before-define
            onIotClient?.next(await createNewIotClient())
          } catch (_) {
            // ignore, already logged
          }
        })

        logDebug('Created new MQTT Client')
        return mqttClient
      } catch (e) {
        logError('Failed to Create an MQTT Client')
        logError(e)
        throw e
      }
    }

    onIotClient = new BehaviorSubject<AwsIotDevice>(await createNewIotClient())

    onIotClient.pipe(debounceTime(iotClientRefreshPeriod)).subscribe(() => {
      createNewIotClient()
        .then((client) => onIotClient?.next(client))
        .catch(logError)
    })

    return onIotClient
  }

  async getDevices() {
    const [devices, onIotClient] = await Promise.all([
        this.getIotDevices(),
        this.getOnIotClient(),
      ]),
      createDevice = <T extends IotDevice<any>>(
        product: string,
        Device: new (info: IotDeviceInfo, onClient: typeof onIotClient) => T
      ): T[] => {
        return devices
          .filter((device) => device.product === product)
          .map((info) => new Device(info, onIotClient))
      }

    return {
      restPluses: createDevice('restPlus', RestPlus),
      restMinis: createDevice('restMini', RestMini),
      restores: createDevice('restore', Restore),
    }
  }
}
