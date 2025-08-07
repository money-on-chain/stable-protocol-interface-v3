import React, { Fragment } from "react"
import { Tooltip } from "antd"
import { formatUnits } from "viem"

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
  i18n: I18n
  isInWei?: boolean
  isUSD?: boolean
  compact?: boolean
}

export const PrecisionNumbers: React.FC<PrecisionNumbersProps> = ({
  amount,
  token,
  decimals,
  i18n,
  isInWei = true,
  isUSD = false,
  compact = false,
}) => {
  if (typeof amount !== "bigint") {
    console.warn("❌ amount must be bigint:", amount)
    return <span>Error</span>
  }

  const tokenDecimals = token?.decimals ?? 18
  const precision = decimals ?? token?.visibleDecimals ?? 2

  let formattedString = "0"
  try {
    formattedString = isInWei
      ? formatUnits(amount, tokenDecimals)
      : amount.toString()
  } catch (err) {
    console.error("❌ Error in formatUnits:", err)
    return <span>Error</span>
  }

  const floatValue = parseFloat(formattedString)

  // Formateador usando Intl.NumberFormat
  const formatter = new Intl.NumberFormat(i18n.languages[0] || "en-US", {
    notation: compact ? "compact" : "standard", // 👈 formato compacto
    maximumFractionDigits: precision,
    minimumFractionDigits: 0,
  })

  const displayValue = formatter.format(floatValue)

  // Prevenir render de números extremadamente grandes
  if (amount >= 2n ** 255n) {
    return <span>Infinity +</span>
  }

  return isUSD ? (
    <Fragment>{displayValue}</Fragment>
  ) : (
    <Tooltip title={formattedString}>
      <span>{displayValue}</span>
    </Tooltip>
  )
}
