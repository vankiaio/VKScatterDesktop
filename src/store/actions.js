import * as Actions from './constants'
import StorageService from '../services/StorageService';
import SocketService from '../services/SocketService';
import PasswordService from '../services/PasswordService';
import BackupService from '../services/BackupService';
import PluginRepository from '../plugins/PluginRepository';
import Hasher from '../util/Hasher'
import IdGenerator from '../util/IdGenerator'
import Mnemonic from '../util/Mnemonic'
import {store} from '../store/store';

import Identity from '../models/Identity';
import Scatter from '../models/Scatter';

import AES from 'aes-oop';
import PopupService from "../services/PopupService";
import {Popup} from '../models/popups/Popup'
import {RUNNING_TESTS} from "../util/TestingHelper";

export const actions = {
    [Actions.HIDE_BACK_BTN]:({commit}, x) => commit(Actions.HIDE_BACK_BTN, x),
    [Actions.ADD_RESOURCES]:({commit}, x) => commit(Actions.ADD_RESOURCES, x),
    [Actions.SET_RESOURCES]:({commit}, x) => commit(Actions.SET_RESOURCES, x),
    [Actions.SET_PROCESS]:({commit}, x) => commit(Actions.SET_PROCESS, x),
    [Actions.RELEASE_PROCESS]:({commit}, x) => commit(Actions.RELEASE_PROCESS, x),
    [Actions.SET_WORKING_SCREEN]:({commit}, x) => commit(Actions.SET_WORKING_SCREEN, x),
    [Actions.SET_DAPP_DATA]:({commit}, x) => commit(Actions.SET_DAPP_DATA, x),
    [Actions.SET_DAPP_LOGO]:({commit}, x) => commit(Actions.SET_DAPP_LOGO, x),
    [Actions.SET_SEARCH_TERMS]:({commit}, terms) => commit(Actions.SET_SEARCH_TERMS, terms),
    [Actions.HOLD_SCATTER]:({commit}, scatter) => commit(Actions.SET_SCATTER, scatter),
    [Actions.SET_SEED]:({commit}, password) => {
        return new Promise(async (resolve, reject) => {
            const [mnemonic, seed] = await PasswordService.seedPassword(password);
            resolve(mnemonic);
        })
    },

    [Actions.LOAD_SCATTER]:async ({commit, state, dispatch}) => {

        if(!state.scatter) {
            let scatter = StorageService.getScatter();
            if (!scatter) return null;
            return commit(Actions.SET_SCATTER, scatter);
        }

        if(await PasswordService.verifyPassword()){
            const scatter = state.scatter.clone();

            if(!RUNNING_TESTS){
	            await require('../migrations/migrator').default(scatter);
            }

            scatter.meta.regenerateVersion();
            await dispatch(Actions.SET_SCATTER, scatter);
        }

        return true;
    },

    [Actions.CREATE_SCATTER]:({state, commit, dispatch}, password) => {
        return new Promise(async (resolve, reject) => {
            const scatter = await Scatter.create();

            await SocketService.initialize();

            await StorageService.setSalt(Hasher.unsaltedQuickHash(IdGenerator.text(32)));

            dispatch(Actions.SET_SEED, password).then(mnemonic => {
                dispatch(Actions.SET_SCATTER, scatter).then(_scatter => {

                    PopupService.push(Popup.mnemonic(mnemonic));
                    resolve();
                })
            })
        })
    },

    [Actions.SET_SCATTER]:({commit, state}, scatter) => {
        return new Promise(async resolve => {

            StorageService.setScatter(AES.encrypt(scatter.savable(state.seed), state.seed)).then(() => {
	            BackupService.createAutoBackup()
            });

            commit(Actions.SET_SCATTER, scatter);
            resolve(scatter);
        })
    },

    [Actions.PUSH_POPUP]:({commit}, popup) => commit(Actions.PUSH_POPUP, popup),
    [Actions.RELEASE_POPUP]:({commit}, popup) => commit(Actions.RELEASE_POPUP, popup),
    [Actions.SET_HARDWARE]:({commit}, hardware) => commit(Actions.SET_HARDWARE, hardware),
    [Actions.REMOVE_HARDWARE]:({commit}, key) => commit(Actions.REMOVE_HARDWARE, key),
    [Actions.SET_TOKENS]:({commit}, tokens) => commit(Actions.SET_TOKENS, tokens),
    [Actions.SET_BALANCES]:({commit}, x) => commit(Actions.SET_BALANCES, x),
    [Actions.REMOVE_BALANCES]:({commit}, x) => commit(Actions.REMOVE_BALANCES, x),
    [Actions.SET_PRICES]:({commit}, prices) => commit(Actions.SET_PRICES, prices),
    [Actions.NEW_KEY]:({commit}, x) => commit(Actions.NEW_KEY, x),

};
