# bhp-js-sdk
JavaScript library for BHP. It mainly provides account generation, transaction construction and offline signing functions of bhp You can install this library in the following ways.
```bash
npm i bhp-js-sdk
```

## Examples

### import package

```js
import Bhpnet from 'bhp-js-sdk';
```

### Account
The first step, you need to explain whether the generated wallet is bhp
```js
let crypto = Bhpnet.getCrypto('cosmos');
```

##### generate account
```js
let account = crypto.create();
// account: {"address":"bhp1e4y8urzgjd82447ydlw9tszsm2lxfwdr5hxj4a","phrase":"carbon when squeeze ginger rather science taxi disagree safe season mango teach trust open baby immune nephew youth nothing afraid sick prefer daughter throw","privateKey":"436EB1ACE1D9D8F4EA519D050FF16ADD4B9CAF3D6D0917411857318259022EFF","publicKey":"fap1addwnpepqw36efnhzgurxaq3mxsgf4fjm280dehh20w03u3726arm0deagne5u254g2"}
```
The create method has a parameter:language,Used to specify the generated mnemonic language.The default is 'english'.You have the following options to choose from:
- chinese_simplified
- japanese
- spanish
- english

We recommend choosing 'english'

##### recovery account
via mnemonic
```js
let account = crypto.recover('your seed','your language');

```
or via privateKey

```js
let account = crypto.import('your privateKey');
```
The difference between the above two is that the latter does not return the mnemonic of the account.

### Transaction
Construct a transaction and sign
```js
let builder = Bhpnet.getBuilder('cosmos');
let stdTx = builder.buildAndSignTx('your request', 'your privateKey');
let postTx = stdTx.GetData();
let hash = stdTx.Hash();
```
*buildAndSignTx* has two parameters: 
- request : transaction content,specific instructions are as follows:
    - chain_id : blockchain's chain_id(example:fuxi/irishub/gaia-13001 etc.)
    - from : transaction originator address(example:bhp1ljemm0yznz58qxxs8xyak7fashcfxf5lssn6jm)
    - account_number : you can get it from lcd's 'auth/accounts/'
    - sequence : you can get it from lcd's 'auth/accounts/'
    - fees : transaction fee
    - gas : gas limit
    - memo : transaction description
    - type : transaction type,iris support the following values
        - transfer
        - delegate
        - unbond
        - redelegate
        - withdrawDelegationRewardsAll
        - withdrawDelegationReward
    - msg : message content
- privateKey : your privateKey

*GetData* will return the constructed and signed transaction,you can call lcd's 'tx/broadcast'(cosmos:/txs) to send the transaction.

*Hash* is used to calculate the hash of the transaction,prevent server response from being unavailable due to timeout. You can use hash to confirm if the transaction was successful.For specific usage, please refer to the [test case](./test)
        
### Requirements

* [Node.js](https://nodejs.org)
* npm
