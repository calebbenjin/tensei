import { auth, AuthPluginConfig } from '@tensei/auth'
import { PluginSetupConfig, ResourceContract } from '@tensei/common'

import { resolveFieldTypescriptType } from './helpers'

export const getAuthUserResponseInterface = (
  userResource: ResourceContract,
  authConfig: AuthPluginConfig
) => {
  return `
    export type DataResponse<Response> = AxiosResponse<{
      data: Response
    }>

    export interface AuthResponse {
        ${userResource.data.snakeCaseName}: ${userResource.data.pascalCaseName}
        ${authConfig.httpOnlyCookiesAuth ? '' : 'accessToken: string'}
        ${authConfig.httpOnlyCookiesAuth ? '' : 'expiresIn: number'}
        ${authConfig.enableRefreshTokens ? 'refreshToken: string' : ''}
    }

    export type ResetPasswordResponse = true
    export type ForgotPasswordResponse = true

    ${
      authConfig.twoFactorAuth
        ? `
    export interface EnableTwoFactorResponse {
        dataURL: string
        ${userResource.data.snakeCaseName}: ${userResource.data.pascalCaseName}
    }

    export interface ConfirmEnableTwoFactorResponse {
        ${userResource.data.snakeCaseName}: ${userResource.data.pascalCaseName}
    }

    export interface DisableTwoFactorResponse {
        ${userResource.data.snakeCaseName}: ${userResource.data.pascalCaseName}
    }
    `
        : ``
    }

    ${
      authConfig.verifyEmails
        ? `
    export type ResendVerificationEmailResponse = true
    export interface ConfirmEmailResponse {
        ${userResource.data.snakeCaseName}: ${userResource.data.pascalCaseName}
    }
    `
        : ``
    }
    `
}

export const generateAuthTypes = (
  authConfig: AuthPluginConfig,
  config: PluginSetupConfig
) => {
  const interfaces = getInterfaceNames(authConfig)

  const userResource = config.resources.find(
    resource => resource.data.name === authConfig.userResource
  )

  const fields = userResource?.data.fields.filter(
    field =>
      !field.showHideFieldFromApi.hideOnCreateApi &&
      !field.isHidden &&
      field.databaseField !== 'id'
  )

  const socialProviders = Object.keys(authConfig.providers)

  return `
        export interface ${interfaces.LoginInput} {
            email: string
            password: string
            twoFactorToken?: string
        }

        ${
          socialProviders.length > 0
            ? `
            export type AvailableSocialProviders = ${socialProviders
              .map(provider => `'${provider}'`)
              .join('|')}
        `
            : ''
        }

        export interface ${interfaces.RegisterInput} {
            ${fields?.map(
              field =>
                `${field.databaseField}: ${resolveFieldTypescriptType(
                  field,
                  config.resources,
                  true
                )}`
            )}
            password: string
        }

        export interface ${interfaces.ForgotPasswordInput} {
            email: string
        }

        export interface ${interfaces.ResetPasswordInput} {
            token: string
            password: string
        }

        export interface TokenStorage {
            name: string
            set<T>(value: T): void
            get<T>(): T
            clear: () => void
        }

        export interface TokenStorageValue {
            accessTokenExpiresIn: number
            refreshToken: string
            currentTime: string
        }

        export interface AccessTokenStorageValue {
            accessTokenExpiresAt: string
            accessToken: string
            currentTime: string
            expiresIn: number
        }

        export interface ConfirmEmailInput {
            emailVerificationToken: string
        }

        export interface TwoFactorInput {
            token: string
        }
    `
}

export const getInterfaceNames = (config: AuthPluginConfig) => {
  return {
    LoginInput: `Login${config.userResource}Input`,
    RegisterInput: `Register${config.userResource}Input`,
    ForgotPasswordInput: `ForgotPasswordInput`,
    ResetPasswordInput: `ResetPasswordInput`,
    ConfirmEmailInput: `ConfirmEmailInput`,
    TwoFactorInput: 'TwoFactorInput'
  }
}

export const generateAuthApi = (config: PluginSetupConfig) => {
  const authPlugin = config.plugins.find(
    plugin => plugin.config.name === 'Auth'
  )

  if (!authPlugin) {
    return ``
  }

  const authConfig = authPlugin.config.extra as AuthPluginConfig

  const userResource = config.resources.find(
    resource => resource.data.name === authConfig.userResource
  )

  if (!userResource) {
    return ``
  }

  const interfaces = getInterfaceNames(authConfig)

  const { twoFactorAuth } = authConfig

  return `
    ${generateAuthTypes(authConfig, config)}
    ${getAuthUserResponseInterface(userResource!, authConfig)}
    export interface AuthSdkContract {
        /**
         * 
         * Login an existing ${authConfig.userResource.toLowerCase()}.
         *      Example:
         *          await tensei.auth().login({
         *              object: {
         *                email: 'hey@tenseijs.com',
         *                password: 'password'
         *              }
         *          })
         *
         **/
        login(payload: { object: ${
          interfaces.LoginInput
        }, skipAuthentication?: boolean }): Promise<DataResponse<AuthResponse>>

        /**
         * 
         * Load an existing session from storage
         *         Example:
         *              await tensei.auth().loadExistingSession()
         * 
         * 
         **/
        loadExistingSession(): Promise<DataResponse<AuthResponse>>

        ${
          Object.keys(authConfig.providers).length > 0
            ? `
        /**
         * 
         * Get the redirect url to the tensei API for a
         * specific social provider:
         *         Example:
         *              await tensei.auth().socialRedirectUrl('google')
         * 
         **/
        socialRedirectUrl(provider: AvailableSocialProviders): string

        /**
         * 
         * Confirm social authenticated and login a user. If you omit the access token, this method will
         * try to get the accessToken parameter from the window URL.
         *      Example:
         *           await tensei.auth().socialConfirm({ object: { accessToken: '6582ab8e9957f3d4e331a821823065c2cde0c32c8' } })
         * 
         **/
        socialConfirm(payload?: { object: { accessToken: string } }): Promise<DataResponse<AuthResponse>>
        `
            : ``
        }

        /**
         * 
         * Fetch the authenticated ${userResource.data.snakeCaseName.toLowerCase()} details.
         * 
         **
        me(): Promise<DataResponse<AuthResponse['user']>>


        /**
         * 
         * Register event listener to be called after auth data is changed.
         *      Example:
         *          tensei.auth().listen((auth) => {
         *              setUser(auth.user)
         *          })
         * 
         **/
        listen(fn: (auth?: AuthResponse) => void): void

        ${
          authConfig.enableRefreshTokens
            ? `
        /**
         * 
         * Silently get a new access token for an existing ${authConfig.userResource.toLowerCase()} session.
         *      Example:
         *          await tensei.auth().silentLogin()
         *
         **/
        silentLogin(): void

        /**
         * 
         * Call API to get a new access token from valid refresh token.
         *      Example:
         *          await tensei.auth().refreshToken({ token: '6582ab8e9957f3d4e331a821823065c2cde0c32c8' })
         *
         **/
        refreshToken(payload: { token: string }): Promise<DataResponse<AuthResponse>>
        `
            : ``
        }

        /**
         * 
         * Logout a currently logged in ${authConfig.userResource.toLowerCase()}.
         *      Example:
         *          await tensei.auth().logout()
         *
         **/
        logout(payload?: { skipAuthentication?: boolean }): void

        /**
         * 
         * Register a ${authConfig.userResource.toLowerCase()}.
         *      Example:
         *          await tensei.auth().register({
         *              email: 'hey@tenseijs.com',
         *              password: 'password'
         *          })
         **/
        register(payload: { object: ${
          interfaces.RegisterInput
        }, skipAuthentication?: boolean }): Promise<DataResponse<AuthResponse>>

        /**
         * 
         * Request a password reset for a ${authConfig.userResource.toLowerCase()}.
         *      Example:
         *          await tensei.auth().forgotPassword({
         *              email: 'hey@tenseijs.com'
         *          })
         **/
        forgotPassword(payload: { object: ${
          interfaces.ForgotPasswordInput
        } }): Promise<DataResponse<ForgotPasswordResponse>>

        /**
         * 
         * Reset a password for a ${authConfig.userResource.toLowerCase()} using a password reset token.
         *      Example:
         *          await tensei.auth().resetPassword({
         *              token: 'b8e9957f3d4e331a821823065c2cde0c32c8b54c',
         *              password: 'new-password'
         *          })
         **/
        resetPassword(payload: { object: ${
          interfaces.ResetPasswordInput
        } }): Promise<DataResponse<ForgotPasswordResponse>>

        ${
          twoFactorAuth
            ? `
        /**
         * 
         * Start the process of enabling two-factor auth. Returns a dataURL QRCode for user to scan with
         * mobile authentication device.
         *      Example:
         *           await tensei.auth().enableTwoFactor()
         * 
         **/
        enableTwoFactor(): Promise<DataResponse<EnableTwoFactorResponse>>

        /**
         * 
         * Confirm enable two-factor authentication for a user.
         *      Example:
         *           await tensei.auth().confirmEnableTwoFactor({ object: { token: '344056' } })
         * 
         **/
        confirmEnableTwoFactor(payload: { object: TwoFactorInput }): Promise<DataResponse<ConfirmEnableTwoFactorResponse>>

        /**
         * 
         * Disable two-factor authentication on a user account
         *      Example:
         *           await tensei.auth().disableTwoFactor({ object: { token: '344056' } })
         * 
         **/
        disableTwoFactor(payload: { object: TwoFactorInput }): Promise<DataResponse<DisableTwoFactorResponse>>
        `
            : ``
        }

        ${
          authConfig.verifyEmails
            ? `
        
        /**
         * 
         * Resend verification email to user.
         *      Example: await tensei.auth().resendVerificationEmail()
         * 
         **/
        resendVerificationEmail(): Promise<DataResponse<ResendVerificationEmailResponse>>

        /**
         * 
         * Confirm user email using verification token coming from user email
         *      Example: await tensei.auth().confirmEmail({ object: { token: 'b8e9957f3dd4e331a8218230654e331a821823065c2cde0c32d5c8b54cd4e331a821823065' } })
         * 
         **/
        confirmEmail(payload: { object: ${interfaces.ConfirmEmailInput} }): Promise<DataResponse<ConfirmEmailResponse>>
        `
            : ``
        }
    }
    `
}
