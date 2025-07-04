import React from "react";
import { Select } from "antd";
import PropTypes from "prop-types";

import { getCurrenciesDetail } from "../../helpers/currencies";
//import { AuthenticateContext } from "../../context/Auth";
import { useProjectTranslation } from "../../helpers/translations";

const { Option } = Select;

interface CurrencyOption {
    value: string;
    image: React.ReactNode;
    label: string;
    abbr: string;
}

interface CurrencyDropDownProps {
    value?: string;
    onChange?: (value: string) => void;
    currencyOptions: string[];
    disabled?: boolean;
    action: string;
}

export default function CurrencyDropDown(props: CurrencyDropDownProps): JSX.Element {
    const { value, onChange, currencyOptions, disabled, action } = props;
    const { t, ns } = useProjectTranslation();

    const options: CurrencyOption[] = getCurrenciesDetail().map((it: any) => ({
        value: it.value,
        image: it.image,
        label: t(`${action}.tokens.${it.value}.label`, { ns: ns }),
        abbr: t(`${action}.tokens.${it.value}.abbr`, { ns: ns }),
    }));
    const option: CurrencyOption | undefined = options.find((it: CurrencyOption) => it.value === value);
    const optionsFiltered: CurrencyOption[] = options.filter((it: CurrencyOption) =>
        currencyOptions.includes(it.value)
    );
    //const auth = useContext(AuthenticateContext);
    return (
        <div className={`SelectCurrency ${disabled ? "disabled" : ""}`}>
            <Select
                className={`${action}-select-token`}
                size={"large"}
                onChange={onChange}
                disabled={disabled}
                value={option && option.value}
            >
                {optionsFiltered.map((possibleOption: CurrencyOption) => (
                    <Option
                        key={possibleOption.value}
                        value={possibleOption.value}
                    >
                        <div className="token">
                            <div className="token__icon">
                                {possibleOption.image}
                            </div>
                            <div className="token__name">
                                {possibleOption.label}
                            </div>
                            <div className="token__ticker">{`(${possibleOption.abbr})`}</div>{" "}
                        </div>
                    </Option>
                ))}
            </Select>
        </div>
    );
}

CurrencyDropDown.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    currencyOptions: PropTypes.array,
    disabled: PropTypes.bool,
    action: PropTypes.string,
};
