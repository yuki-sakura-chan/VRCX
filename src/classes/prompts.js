import * as workerTimers from 'worker-timers';
import configRepository from '../service/config.js';
import { baseClass, $app, API, $t, $utils } from './baseClass.js';
import { avatarRequest, favoriteRequest, worldRequest } from '../api';
import database  from '../service/database.js';

export default class extends baseClass {
    constructor(_app, _API, _t) {
        super(_app, _API, _t);
    }

    _methods = {
        promptTOTP() {
            if (this.twoFactorAuthDialogVisible) {
                return;
            }
            AppApi.FlashWindow();
            this.twoFactorAuthDialogVisible = true;
            this.$prompt(
                $t('prompt.totp.description'),
                $t('prompt.totp.header'),
                {
                    distinguishCancelAndClose: true,
                    cancelButtonText: $t('prompt.totp.use_otp'),
                    confirmButtonText: $t('prompt.totp.verify'),
                    inputPlaceholder: $t('prompt.totp.input_placeholder'),
                    inputPattern: /^[0-9]{6}$/,
                    inputErrorMessage: $t('prompt.totp.input_error'),
                    callback: (action, instance) => {
                        if (action === 'confirm') {
                            API.verifyTOTP({
                                code: instance.inputValue.trim()
                            })
                                .catch((err) => {
                                    $app.clearCookiesTryLogin();
                                    throw err;
                                })
                                .then((args) => {
                                    API.getCurrentUser();
                                    return args;
                                });
                        } else if (action === 'cancel') {
                            this.promptOTP();
                        }
                    },
                    beforeClose: (action, instance, done) => {
                        this.twoFactorAuthDialogVisible = false;
                        done();
                    }
                }
            );
        },

        promptOTP() {
            if (this.twoFactorAuthDialogVisible) {
                return;
            }
            this.twoFactorAuthDialogVisible = true;
            this.$prompt(
                $t('prompt.otp.description'),
                $t('prompt.otp.header'),
                {
                    distinguishCancelAndClose: true,
                    cancelButtonText: $t('prompt.otp.use_totp'),
                    confirmButtonText: $t('prompt.otp.verify'),
                    inputPlaceholder: $t('prompt.otp.input_placeholder'),
                    inputPattern: /^[a-z0-9]{4}-[a-z0-9]{4}$/,
                    inputErrorMessage: $t('prompt.otp.input_error'),
                    callback: (action, instance) => {
                        if (action === 'confirm') {
                            API.verifyOTP({
                                code: instance.inputValue.trim()
                            })
                                .catch((err) => {
                                    $app.clearCookiesTryLogin();
                                    throw err;
                                })
                                .then((args) => {
                                    API.getCurrentUser();
                                    return args;
                                });
                        } else if (action === 'cancel') {
                            this.promptTOTP();
                        }
                    },
                    beforeClose: (action, instance, done) => {
                        this.twoFactorAuthDialogVisible = false;
                        done();
                    }
                }
            );
        },

        promptEmailOTP() {
            if (this.twoFactorAuthDialogVisible) {
                return;
            }
            AppApi.FlashWindow();
            this.twoFactorAuthDialogVisible = true;
            this.$prompt(
                $t('prompt.email_otp.description'),
                $t('prompt.email_otp.header'),
                {
                    distinguishCancelAndClose: true,
                    cancelButtonText: $t('prompt.email_otp.resend'),
                    confirmButtonText: $t('prompt.email_otp.verify'),
                    inputPlaceholder: $t('prompt.email_otp.input_placeholder'),
                    inputPattern: /^[0-9]{6}$/,
                    inputErrorMessage: $t('prompt.email_otp.input_error'),
                    callback: (action, instance) => {
                        if (action === 'confirm') {
                            API.verifyEmailOTP({
                                code: instance.inputValue.trim()
                            })
                                .catch((err) => {
                                    this.promptEmailOTP();
                                    throw err;
                                })
                                .then((args) => {
                                    API.getCurrentUser();
                                    return args;
                                });
                        } else if (action === 'cancel') {
                            this.resendEmail2fa();
                        }
                    },
                    beforeClose: (action, instance, done) => {
                        this.twoFactorAuthDialogVisible = false;
                        done();
                    }
                }
            );
        },

        promptOmniDirectDialog() {
            this.$prompt(
                $t('prompt.direct_access_omni.description'),
                $t('prompt.direct_access_omni.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.direct_access_omni.ok'),
                    cancelButtonText: $t('prompt.direct_access_omni.cancel'),
                    inputPattern: /\S+/,
                    inputErrorMessage: $t(
                        'prompt.direct_access_omni.input_error'
                    ),
                    callback: (action, instance) => {
                        if (action === 'confirm' && instance.inputValue) {
                            var input = instance.inputValue.trim();
                            if (!this.directAccessParse(input)) {
                                this.$message({
                                    message: $t(
                                        'prompt.direct_access_omni.message.error'
                                    ),
                                    type: 'error'
                                });
                            }
                        }
                    }
                }
            );
        },

        promptNotificationTimeout() {
            this.$prompt(
                $t('prompt.notification_timeout.description'),
                $t('prompt.notification_timeout.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.notification_timeout.ok'),
                    cancelButtonText: $t('prompt.notification_timeout.cancel'),
                    inputValue: this.notificationTimeout / 1000,
                    inputPattern: /\d+$/,
                    inputErrorMessage: $t(
                        'prompt.notification_timeout.input_error'
                    ),
                    callback: async (action, instance) => {
                        if (
                            action === 'confirm' &&
                            instance.inputValue &&
                            !isNaN(instance.inputValue)
                        ) {
                            this.notificationTimeout = Math.trunc(
                                Number(instance.inputValue) * 1000
                            );
                            await configRepository.setString(
                                'VRCX_notificationTimeout',
                                this.notificationTimeout
                            );
                            this.updateVRConfigVars();
                        }
                    }
                }
            );
        },

        promptPhotonOverlayMessageTimeout() {
            this.$prompt(
                $t('prompt.overlay_message_timeout.description'),
                $t('prompt.overlay_message_timeout.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.overlay_message_timeout.ok'),
                    cancelButtonText: $t(
                        'prompt.overlay_message_timeout.cancel'
                    ),
                    inputValue: this.photonOverlayMessageTimeout / 1000,
                    inputPattern: /\d+$/,
                    inputErrorMessage: $t(
                        'prompt.overlay_message_timeout.input_error'
                    ),
                    callback: async (action, instance) => {
                        if (
                            action === 'confirm' &&
                            instance.inputValue &&
                            !isNaN(instance.inputValue)
                        ) {
                            this.photonOverlayMessageTimeout = Math.trunc(
                                Number(instance.inputValue) * 1000
                            );
                            await configRepository.setString(
                                'VRCX_photonOverlayMessageTimeout',
                                this.photonOverlayMessageTimeout
                            );
                            this.updateVRConfigVars();
                        }
                    }
                }
            );
        },

        promptRenameWorld(world) {
            this.$prompt(
                $t('prompt.rename_world.description'),
                $t('prompt.rename_world.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.rename_world.ok'),
                    cancelButtonText: $t('prompt.rename_world.cancel'),
                    inputValue: world.ref.name,
                    inputErrorMessage: $t('prompt.rename_world.input_error'),
                    callback: (action, instance) => {
                        if (
                            action === 'confirm' &&
                            instance.inputValue !== world.ref.name
                        ) {
                            worldRequest
                                .saveWorld({
                                    id: world.id,
                                    name: instance.inputValue
                                })
                                .then((args) => {
                                    this.$message({
                                        message: $t(
                                            'prompt.rename_world.message.success'
                                        ),
                                        type: 'success'
                                    });
                                    return args;
                                });
                        }
                    }
                }
            );
        },

        promptChangeWorldDescription(world) {
            this.$prompt(
                $t('prompt.change_world_description.description'),
                $t('prompt.change_world_description.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.change_world_description.ok'),
                    cancelButtonText: $t(
                        'prompt.change_world_description.cancel'
                    ),
                    inputValue: world.ref.description,
                    inputErrorMessage: $t(
                        'prompt.change_world_description.input_error'
                    ),
                    callback: (action, instance) => {
                        if (
                            action === 'confirm' &&
                            instance.inputValue !== world.ref.description
                        ) {
                            worldRequest
                                .saveWorld({
                                    id: world.id,
                                    description: instance.inputValue
                                })
                                .then((args) => {
                                    this.$message({
                                        message: $t(
                                            'prompt.change_world_description.message.success'
                                        ),
                                        type: 'success'
                                    });
                                    return args;
                                });
                        }
                    }
                }
            );
        },

        promptChangeWorldCapacity(world) {
            this.$prompt(
                $t('prompt.change_world_capacity.description'),
                $t('prompt.change_world_capacity.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.change_world_capacity.ok'),
                    cancelButtonText: $t('prompt.change_world_capacity.cancel'),
                    inputValue: world.ref.capacity,
                    inputPattern: /\d+$/,
                    inputErrorMessage: $t(
                        'prompt.change_world_capacity.input_error'
                    ),
                    callback: (action, instance) => {
                        if (
                            action === 'confirm' &&
                            instance.inputValue !== world.ref.capacity
                        ) {
                            worldRequest
                                .saveWorld({
                                    id: world.id,
                                    capacity: instance.inputValue
                                })
                                .then((args) => {
                                    this.$message({
                                        message: $t(
                                            'prompt.change_world_capacity.message.success'
                                        ),
                                        type: 'success'
                                    });
                                    return args;
                                });
                        }
                    }
                }
            );
        },

        promptChangeWorldRecommendedCapacity(world) {
            this.$prompt(
                $t('prompt.change_world_recommended_capacity.description'),
                $t('prompt.change_world_recommended_capacity.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.change_world_capacity.ok'),
                    cancelButtonText: $t('prompt.change_world_capacity.cancel'),
                    inputValue: world.ref.recommendedCapacity,
                    inputPattern: /\d+$/,
                    inputErrorMessage: $t(
                        'prompt.change_world_recommended_capacity.input_error'
                    ),
                    callback: (action, instance) => {
                        if (
                            action === 'confirm' &&
                            instance.inputValue !==
                                world.ref.recommendedCapacity
                        ) {
                            worldRequest
                                .saveWorld({
                                    id: world.id,
                                    recommendedCapacity: instance.inputValue
                                })
                                .then((args) => {
                                    this.$message({
                                        message: $t(
                                            'prompt.change_world_recommended_capacity.message.success'
                                        ),
                                        type: 'success'
                                    });
                                    return args;
                                });
                        }
                    }
                }
            );
        },

        promptChangeWorldYouTubePreview(world) {
            this.$prompt(
                $t('prompt.change_world_preview.description'),
                $t('prompt.change_world_preview.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.change_world_preview.ok'),
                    cancelButtonText: $t('prompt.change_world_preview.cancel'),
                    inputValue: world.ref.previewYoutubeId,
                    inputErrorMessage: $t(
                        'prompt.change_world_preview.input_error'
                    ),
                    callback: (action, instance) => {
                        if (
                            action === 'confirm' &&
                            instance.inputValue !== world.ref.previewYoutubeId
                        ) {
                            if (instance.inputValue.length > 11) {
                                try {
                                    var url = new URL(instance.inputValue);
                                    var id1 = url.pathname;
                                    var id2 = url.searchParams.get('v');
                                    if (id1 && id1.length === 12) {
                                        instance.inputValue = id1.substring(
                                            1,
                                            12
                                        );
                                    }
                                    if (id2 && id2.length === 11) {
                                        instance.inputValue = id2;
                                    }
                                } catch {
                                    this.$message({
                                        message: $t(
                                            'prompt.change_world_preview.message.error'
                                        ),
                                        type: 'error'
                                    });
                                    return;
                                }
                            }
                            if (
                                instance.inputValue !==
                                world.ref.previewYoutubeId
                            ) {
                                worldRequest
                                    .saveWorld({
                                        id: world.id,
                                        previewYoutubeId: instance.inputValue
                                    })
                                    .then((args) => {
                                        this.$message({
                                            message: $t(
                                                'prompt.change_world_preview.message.success'
                                            ),
                                            type: 'success'
                                        });
                                        return args;
                                    });
                            }
                        }
                    }
                }
            );
        },

        promptMaxTableSizeDialog() {
            this.$prompt(
                $t('prompt.change_table_size.description'),
                $t('prompt.change_table_size.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.change_table_size.save'),
                    cancelButtonText: $t('prompt.change_table_size.cancel'),
                    inputValue: this.maxTableSize,
                    inputPattern: /\d+$/,
                    inputErrorMessage: $t(
                        'prompt.change_table_size.input_error'
                    ),
                    callback: async (action, instance) => {
                        if (action === 'confirm' && instance.inputValue) {
                            if (instance.inputValue > 10000) {
                                instance.inputValue = 10000;
                            }
                            this.maxTableSize = instance.inputValue;
                            await configRepository.setString(
                                'VRCX_maxTableSize',
                                this.maxTableSize
                            );
                            database().setmaxTableSize(this.maxTableSize);
                            this.feedTableLookup();
                            this.gameLogTableLookup();
                        }
                    }
                }
            );
        },

        promptProxySettings() {
            this.$prompt(
                $t('prompt.proxy_settings.description'),
                $t('prompt.proxy_settings.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.proxy_settings.restart'),
                    cancelButtonText: $t('prompt.proxy_settings.close'),
                    inputValue: this.proxyServer,
                    inputPlaceholder: $t('prompt.proxy_settings.placeholder'),
                    callback: async (action, instance) => {
                        this.proxyServer = instance.inputValue;
                        await VRCXStorage.Set(
                            'VRCX_ProxyServer',
                            this.proxyServer
                        );
                        await VRCXStorage.Flush();
                        await new Promise((resolve) => {
                            workerTimers.setTimeout(resolve, 100);
                        });
                        if (action === 'confirm') {
                            var isUpgrade = false;
                            this.restartVRCX(isUpgrade);
                        }
                    }
                }
            );
        },

        promptPhotonLobbyTimeoutThreshold() {
            this.$prompt(
                $t('prompt.photon_lobby_timeout.description'),
                $t('prompt.photon_lobby_timeout.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.photon_lobby_timeout.ok'),
                    cancelButtonText: $t('prompt.photon_lobby_timeout.cancel'),
                    inputValue: this.photonLobbyTimeoutThreshold / 1000,
                    inputPattern: /\d+$/,
                    inputErrorMessage: $t(
                        'prompt.photon_lobby_timeout.input_error'
                    ),
                    callback: async (action, instance) => {
                        if (
                            action === 'confirm' &&
                            instance.inputValue &&
                            !isNaN(instance.inputValue)
                        ) {
                            this.photonLobbyTimeoutThreshold = Math.trunc(
                                Number(instance.inputValue) * 1000
                            );
                            await configRepository.setString(
                                'VRCX_photonLobbyTimeoutThreshold',
                                this.photonLobbyTimeoutThreshold
                            );
                        }
                    }
                }
            );
        },

        promptAutoClearVRCXCacheFrequency() {
            this.$prompt(
                $t('prompt.auto_clear_cache.description'),
                $t('prompt.auto_clear_cache.header'),
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: $t('prompt.auto_clear_cache.ok'),
                    cancelButtonText: $t('prompt.auto_clear_cache.cancel'),
                    inputValue: this.clearVRCXCacheFrequency / 3600 / 2,
                    inputPattern: /\d+$/,
                    inputErrorMessage: $t(
                        'prompt.auto_clear_cache.input_error'
                    ),
                    callback: async (action, instance) => {
                        if (
                            action === 'confirm' &&
                            instance.inputValue &&
                            !isNaN(instance.inputValue)
                        ) {
                            this.clearVRCXCacheFrequency = Math.trunc(
                                Number(instance.inputValue) * 3600 * 2
                            );
                            await configRepository.setString(
                                'VRCX_clearVRCXCacheFrequency',
                                this.clearVRCXCacheFrequency
                            );
                        }
                    }
                }
            );
        }
    };
}
