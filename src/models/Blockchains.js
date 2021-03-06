
export const Blockchains = {
    VKTIO:'vkt',
    EOSIO:'eos',
    ETH:'eth',
    TRX:'trx'
};

export const BlockchainsArray =
    Object.keys(Blockchains).map(key => ({key, value:Blockchains[key]}));

export const blockchainName = x => {
    switch(x){
        case Blockchains.VKTIO: return 'VKTIO';
        case Blockchains.EOSIO: return 'EOSIO';
        case Blockchains.ETH: return 'Ethereum';
        case Blockchains.TRX: return 'Tron';
    }
}
