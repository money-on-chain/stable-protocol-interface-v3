import "./Styles.scss";

import { Button, Modal } from "antd";
import React, { useState } from "react";

import { getCurrenciesDetail } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";

interface CurrencyOption {
    value: string;
    image: React.ReactNode;
    label: string;
    abbreviation: string;
}

interface CurrencyPopUpProps {
    value?: string;
    onChange: (value: string) => void;
    currencyOptions: string[];
    disabled?: boolean;
    action: string;
    title?: string;

    /** If true, renders as display-only and disables modal interaction */
    displayOnly?: boolean;
}

export default function CurrencyPopUp(props: CurrencyPopUpProps): JSX.Element {
    const {
        value,
        onChange,
        currencyOptions,
        disabled,
        action,
        title,
        displayOnly = false,
    } = props;

    const { t, ns } = useProjectTranslation();
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

    const options: CurrencyOption[] = getCurrenciesDetail().map((currency) => ({
        value: currency.value,
        image: currency.image,
        label: t(`${action}.tokens.${currency.value}.label`, { ns }),
        abbreviation: t(`${action}.tokens.${currency.value}.abbr`, { ns }),
    }));

    const arrayAdded: string[] = [];
    const optionsFiltered: CurrencyOption[] = options.filter((item) => {
        if (!arrayAdded.includes(item.abbreviation)) {
            if (!(action === "exchange" && item.value === "COINBASE")) {
                arrayAdded.push(item.abbreviation);
            }
            return item;
        }
        return false;
    });

    const selectedCurrency: CurrencyOption | undefined = optionsFiltered.find(
        (currency) => currency.value === value
    );

    const filteredOptions: CurrencyOption[] = optionsFiltered.filter(
        (currency) => currencyOptions.includes(currency.value)
    );

    const openModal = (): void => {
        if (!disabled && !displayOnly) {
            setIsModalVisible(true);
        }
    };

    const closeModal = (): void => {
        setIsModalVisible(false);
    };

    const handleSelect = (selectedValue: string): void => {
        onChange(selectedValue);
        closeModal();
    };

    return (
        <div
            className={`SelectCurrency ${
                disabled ? "disabled" : ""
            } ${displayOnly ? "display-only" : ""}`}
        >
            <div
                className={`${action}-select-token`}
                onClick={!displayOnly ? openModal : undefined}
                style={{ cursor: displayOnly ? "default" : "pointer" }}
            >
                {selectedCurrency ? (
                    <div className="selected-token">
                        <div className="token__icon">
                            {selectedCurrency.image}
                        </div>
                        <div className="token__name">
                            {selectedCurrency.label}
                        </div>
                        <div className="token__ticker">
                            {`(${selectedCurrency.abbreviation})`}
                        </div>

                        {!displayOnly && (
                            <div className="icon__toggle__expand"></div>
                        )}
                    </div>
                ) : (
                    !displayOnly && (
                        <Button type="primary" disabled={disabled}>
                            Select Token
                        </Button>
                    )
                )}
            </div>

            {!displayOnly && (
                <Modal
                    title={
                        title && title.trim() !== "" ? title : "Select a Token"
                    }
                    open={isModalVisible}
                    onCancel={closeModal}
                    footer={null}
                    centered
                    className="select__token__modal"
                >
                    <div className="token-list">
                        {filteredOptions.map((currency) => (
                            <div
                                key={currency.value}
                                className={`token-item ${
                                    currency.value === value
                                        ? "is-selected"
                                        : ""
                                }`}
                                onClick={() => handleSelect(currency.value)}
                            >
                                <div className="token__icon">
                                    {currency.image}
                                </div>
                                <div className="token__name">
                                    {currency.label}
                                </div>
                                <div className="token__ticker">
                                    {`(${currency.abbreviation})`}
                                </div>

                                {currency.value === value && (
                                    <div className="icon__selected selected-icon"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
}
