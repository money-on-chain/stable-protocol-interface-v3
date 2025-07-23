import React, { Fragment } from "react"
import { Tooltip } from "antd"
import { formatUnits } from "viem"
// @ts-ignore
import NumericLabel from "react-pretty-numbers"

interface Token {
  decimals: number
  visibleDecimals: number
}

interface I18n {
  languages: readonly string[]
}

interface PrecisionNumbersProps {
  amount: bigint
  token: Token
  decimals?: number
  numericLabelParams?: any
  i18n: I18n
  skipContractConvert?: boolean
  isUSD?: boolean
}

export const PrecisionNumbers: React.FC<PrecisionNumbersProps> = ({
  amount,
  token,
  decimals,
  numericLabelParams = {},
  i18n,
  skipContractConvert = false,
  isUSD = false,
}) => {
  if (typeof amount !== "bigint") {
    console.warn("❌ amount debe ser bigint:", amount)
    return <span>Error</span>
  }

  const tokenDecimals = token?.decimals ?? 18
  const precision = decimals ?? token?.visibleDecimals ?? 2

  let formattedString = "0"
  try {
    formattedString = skipContractConvert
      ? amount.toString()
      : formatUnits(amount, tokenDecimals)
  } catch (err) {
    console.error("❌ Error en formatUnits:", err)
    return <span>Error</span>
  }

  const formattedNumber = parseFloat(formattedString)

  const params = Object.assign(
    {
      shortFormat: !isUSD,
      justification: "L",
      locales: i18n.languages[0],
      shortFormatMinValue: 1000000,
      commafy: true,
      shortFormatPrecision: precision,
      precision: precision,
      title: "",
      cssClass: ["display-inline"],
    },
    numericLabelParams
  )

  if (amount >= 2n ** 255n) {
    return <span>Infinity +</span>
  }

  return isUSD ? (
    <Fragment>{formattedString}</Fragment>
  ) : (
    <Tooltip title={formattedString}>
      <NumericLabel {...{ params }}>{formattedString}</NumericLabel>
    </Tooltip>
  )
}
