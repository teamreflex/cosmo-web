### sending

1. login to cosmo
2. save the refreshToken and accessToken
3. search for a user in cosmo, save the username and the address
4. make a request to the cosmo gas station, save something
5. build a gas estimate function call and save it to `functionData`
   - `to`: objekt contract address
   - `data`: the encoded function call (hash this somehow?)
     - `src`: sender (address)
     - `dst`: receiver (address)
     - `amount`: objekt token id (uint256)
6. get a gas estimate from alchemy: `eth_estimateGas` and save the result to `gasEstimate`
7. with ethersjs, serialize a transaction with the following params:
   - `type`: 2 (eip-1559)
   - `chainId`: 137 (polygon chain id)
   - `nonce`: 48 (random number)
   - `maxPriorityFeePerGas`: 60000000000 (static)
   - `maxFeePerGas`: 132796452181 (unsure)
   - `gasPrice`: null
   - `gasLimit`: use `gasEstimate` here but run it through `parseInt` to decode
   - `to`: 0x0fB69F54bA90f17578a59823E09e5a1f8F3FA200 (objekt contract address)
   - `value`: 0
   - `data`: `gasEstimate`
   - `accessList`: []
8. show the ramper page with query string: https://modhaus.v1.ramper.xyz/en/m/ethereum/transaction/transfer
   - `serializedTx`: serialized string from step 7
   - `nftImg`: url encoded url to objekt image
   - `nftName`: Objekt
   - `fromImg`: profile image of current user
   - `fromUser`: cosmo name of current user
   - `toUser`: cosmo name of current user
   - `toImg`: profile image of current user
   - `appId`: alzeakpmqx (ramper app id for cosmo)
   - `uid`: 61195a7b-c9aa-43e6-9968-90f3a2fa8e0b (unsure, can be discarded)
   - `email`: url encoded cosmo email of sender
   - `provider`: email
   - `network`: mainnet
   - `rt`: cosmo refresh token
   - `v`: 2
   - `c`: 1\_\_67ca3a09-c2ee-43d8-8283-f141df1046aff7014a13-3325-4c5e-a149-681ee97c8ab1 (can be discarded)
9. TODO: hit send a see what the page submits. capture that and just send it directly if possible
