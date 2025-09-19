import "./Styles.scss";

import { Button,Modal } from "antd";
import React, { /*useContext,*/ useState } from "react";

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
}

export default function CurrencyPopUp(props: CurrencyPopUpProps): JSX.Element {
    const { value, onChange, currencyOptions, disabled, action, title } = props;
    const { t, ns } = useProjectTranslation();
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

    // Retrieve currency options with details
    const options: CurrencyOption[] = getCurrenciesDetail().map((currency) => ({
        value: currency.value,
        image: currency.image,
        label: t(`${action}.tokens.${currency.value}.label`, { ns: ns }),
        abbreviation: t(`${action}.tokens.${currency.value}.abbr`, { ns: ns }),
    }));

    // Remove duplicated items, except on action exchange & coinbase
    const arrayAdded: string[] = [];
    const optionsFiltered: CurrencyOption[] = options.filter(function (item: CurrencyOption /*index, array*/) {
        if (!arrayAdded.includes(item.abbreviation)) {
            if (!(action === "exchange" && item.value === "COINBASE"))
                arrayAdded.push(item.abbreviation);
            return item;
        }
    });

    // Get the currently selected currency
    const selectedCurrency: CurrencyOption | undefined = optionsFiltered.find(
        (currency) => currency.value === value
    );

    // Filter options to only include allowed currencies
    const filteredOptions: CurrencyOption[] = optionsFiltered.filter((currency) =>
        currencyOptions.includes(currency.value)
    );

    
    // Function to open the modal
    const openModal = (): void => {
        if (!disabled) {
            setIsModalVisible(true);
        }
    };

    // Function to close the modal
    const closeModal = (): void => {
        setIsModalVisible(false);
    };

    // Function to select a currency and close the modal
    const handleSelect = (selectedValue: string): void => {
        onChange(selectedValue);
        closeModal();
    };

    return (
        <div className={`SelectCurrency ${disabled ? "disabled" : ""}`}>
            {/* Button or selected currency to open the modal */}
            <div className={`${action}-select-token`} onClick={openModal}>
                {selectedCurrency ? (
                    <div className="selected-token">
                        <div className="token__icon">
                            {selectedCurrency.image}
                        </div>
                        <div className="token__name">
                            {selectedCurrency.label}
                        </div>
                        <div className="token__ticker">{`(${selectedCurrency.abbreviation})`}</div>
                        <div className="icon__toggle__expand"></div>
                    </div>
                ) : (
                    <Button type="primary" disabled={disabled}>
                        Select Token
                    </Button>
                )}
            </div>

            {/* Ant Design Modal */}
            <Modal
                title={title && title.trim() !== "" ? title : "Select a Token"} // Custom title support
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
                            className={`token-item ${currency.value === value ? "is-selected" : ""}`}
                            onClick={() => handleSelect(currency.value)}
                        >
                            <div className="token__icon">{currency.image}</div>
                            <div className="token__name">{currency.label}</div>
                            <div className="token__ticker">{`(${currency.abbreviation})`}</div>
                            {/* Show checkmark icon only if this is the selected token */}
                            {currency.value === value && (
                                <div className="icon__selected selected-icon"></div>
                            )}
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
} 