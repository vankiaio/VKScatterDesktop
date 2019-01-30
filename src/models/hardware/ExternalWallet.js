import IdGenerator from '../../util/IdGenerator';
import ecc from 'eosjs-ecc'

import {Blockchains} from '../Blockchains'
import LedgerWallet from './LedgerWallet';
import LiquidEOS from './LiquidEOS';

export const EXT_WALLET_TYPES = {
    LEDGER:'Ledger Nano S',
    LIQUID_EOS:'TTMC Wallet/LiquidVKT DIY Hardware Wallet'
};

export const EXT_WALLET_TYPES_ARR = Object.keys(EXT_WALLET_TYPES).map(x => EXT_WALLET_TYPES[x]);

export default class ExternalWallet {

    constructor(_type = EXT_WALLET_TYPES.LEDGER, _blockchain = Blockchains.TTMC){
        this.id = IdGenerator.text(64);
        this.type = _type;
        this.blockchain = _blockchain;
        this.interface = getInterface(_type, _blockchain);
        this.addressIndex = 0;
    }

    static placeholder(){ return new ExternalWallet(); }
    static fromJson(json){
        let p = Object.assign(this.placeholder(), json);
        p.interface = getInterface(p.type, p.blockchain);
        // p.interface.setAddressIndex(p.addressIndex);
        return p;
    }
}

const getInterface = (type, blockchain) => {
    switch(type){
        case EXT_WALLET_TYPES.LEDGER: return LedgerWallet.typeToInterface(blockchain);
        case EXT_WALLET_TYPES.LIQUID_EOS: return LiquidEOS.typeToInterface();
    }
}

export class ExternalWalletInterface {

    constructor(handler){
        this.handler = handler;
    }

    async open(){
        return await this.handler.open();
    }

    async close(){
	    return await this.handler.close();
    }

    async canConnect(){
	    return await this.handler.canConnect();
    }

    async sign(publicKey, trx, abi, network){
        return await this.handler.sign(publicKey, trx, abi, network);
    }

    async getPublicKey(){
        return await this.handler.getPublicKey();
    }

    setAddressIndex(path){
        return this.handler.setAddressIndex(path);
    }

    availableBlockchains(){
        return this.handler.availableBlockchains();
    }

}

