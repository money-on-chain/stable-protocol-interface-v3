# API Operations

Example API operations

```
{
  "operations": [
    {
      "_id": "6596bb00417d6901beddba38",
      "hash": "0xaaa3bbe504f6a8fcfa4dedf2999bfc6e7cd865b54139029c37b812275829da6d",
      "blockNumber": 4667531,
      "operId_": 14,
      "gas": 4500000,
      "gasPrice": "66458000",
      "gasUsed": 99860,
      "gasFeeRBTC": "6636495880000",
      "status": 1,
      "errorCode_": null,
      "msg_": null,
      "reason_": null,
      "operation": "TCMint",
      "createdAt": "2024-01-04T14:07:30Z",
      "lastUpdatedAt": "2024-01-04T11:08:15.887000Z",
      "confirmationTime": "2024-01-04T11:12:45.349000Z",
      "params": {
        "tp": null,
        "tpIndex": null,
        "token": null,
        "amount": null,
        "qTP": null,
        "qTC": "2000000000000000000",
        "qACmax": "2008377952506736588",
        "qACmin": null,
        "qTPmin": null,
        "qTCmin": null,
        "tpFrom": null,
        "tpFromIndex": null,
        "tpTo": null,
        "tpToIndex": null,
        "sender": "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
        "recipient": "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
        "vendor": "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
        "hash": "0x0fa4953c7ca1051d3181b30ad6f8017197424baee5704a7a033746044f9b544c",
        "blockNumber": 4667524,
        "createdAt": "2024-01-04T14:03:52Z",
        "lastUpdatedAt": "2024-01-04T11:04:48.215000Z"
      },
      "executed": {
        "tp_": null,
        "tpIndex_": null,
        "tpFrom_": null,
        "tpFromIndex_": null,
        "tpTo_": null,
        "tpToIndex_": null,
        "qTPfrom_": null,
        "qTPto_": null,
        "tp": null,
        "qTP_": null,
        "qTC_": "2000000000000000000",
        "qAC_": "2004369214078579428",
        "qACfee_": "2000368477124330",
        "qFeeToken_": "0",
        "qACVendorMarkup_": "2000368477124330",
        "qFeeTokenVendorMarkup_": "0",
        "vendor_": "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
        "operId_": 14,
        "sender_": "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
        "recipient_": "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
        "hash": "0xaaa3bbe504f6a8fcfa4dedf2999bfc6e7cd865b54139029c37b812275829da6d",
        "blockNumber": 4667531,
        "createdAt": "2024-01-04T14:07:30Z",
        "lastUpdatedAt": "2024-01-04T11:08:15.874000Z"
      },
      "last_block_indexed": null
    }
  ],
  "count": 19,
  "total": 19,
  "last_block_indexed": 4668159
}
```

### Operations

**operations**: Operation list
**count**: count limit rows
**total**: total rows
**last_block_indexed**: The last block indexed

### Operation

**hash**: Hash of the transaction
**blockNumber**: tx blocknumber
**operId\_**: Operation ID (unique for the operation)
**status**: Status code of the operation.
**operation**: Name of the operation,
**createdAt**: Datetime of the operation created,
**lastUpdatedAt**: Datetime of the last updated status
**confirmationTime**: Datetime of the confirmation of the operation (>10 blocks)
**params**: Params of the function operation
**executed**: Values after the execution of the operation by the queue

### Status of the operation

- **-4**: Revert
- **-3**: Stale Transaction
- **-2**: Error Unhandled
- **-1**: Error
- **0**: Queue (Pending for execution)
- **1**: Executed (Executed by the queue manager)

### Operation

- **1**: mintTC
- **2**: redeemTC
- **3**: mintTP
- **4**: redeemTP
- **5**: mintTCandTP
- **6**: redeemTCandTP
- **7**: swapTCforTP
- **8**: swapTPforTC
- **9**: swapTPforTP

### Collateral Asset (CA) Token:

- **Flipmoney:** DOC
- **RoC:** RIF

### Token Pegged (TP):

- **Flipmoney:** Go ARS, Go COP
- **RoC:** USDRIF

### Token Collateral (TC):

- **Flipmoney:** Go Turbo
- **RoC:** RIFPro

### Amounts

**Precision**: 18

### Operation: minTC

Mint token collateral.

- **Exchange**: CA.
- **Receive**: TC.

**Status = 0**

- **Amount Exchange**: params.qACmax
- **Amount Receive**: params.qTC

**Status = 1**

- **Amount Exchange**: executed.qAC\_
- **Amount Receive**: executed.qTC\_

### Operation: redeemTC

Redeem token collateral.

- **Exchange**: TC.
- **Receive**: CA.

**Status = 0**

- **Amount Exchange**: params.qTC
- **Amount Receive**: params.qACmin

**Status = 1**

- **Amount Exchange**: executed.qTC\_
- **Amount Receive**: executed.qAC\_

### Operation: minTP

Mint token pegged.

- **Exchange**: CA.
- **Receive**: TP.

**Status = 0**

- **Amount Exchange**: params.qACmax
- **Amount Receive**: params.qTP

**Status = 1**

- **Amount Exchange**: executed.qAC\_
- **Amount Receive**: executed.qTP\_

**Note**: **executed.tpIndex\_** the index of the token, in the dapp we refer to some like this:
TP_0 with index 0, or TP_1 with index 1.

### Operation: redeemTP

Redeem token pegged.

- **Exchange**: TP.
- **Receive**: CA.

**Status = 0**

- **Amount Exchange**: params.qACmax
- **Amount Receive**: params.qTP

**Status = 1**

- **Amount Exchange**: executed.qAC\_
- **Amount Receive**: executed.qTP\_

**Note**: **executed.tpIndex\_** the index of the token, in the dapp we refer to some like this:
TP_0 with index 0, or TP_1 with index 1.

### List operation status

- **Queued:** status == 0
- **Confirming:** status == 1 & executed.blockNumber + 10 > last_block_indexed
- **Confirmed:** status == 1 & executed.blockNumber + 10 < last_block_indexed
