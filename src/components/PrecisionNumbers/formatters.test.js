import assert from "node:assert/strict";
import test from "node:test";

import {
    formatFullLocaleValue,
    formatSignificantCompactValue,
} from "./formatters.js";

const locale = "en-US";

test("keeps values below one million unscaled", () => {
    assert.equal(formatSignificantCompactValue(999999.9999, locale), "999,999");
});

test("never shows decimals above ten thousand when unscaled", () => {
    assert.equal(formatSignificantCompactValue(12345.6789, locale), "12,345");
});

test("shows two decimals for unscaled values from ten up to ten thousand", () => {
    assert.equal(formatSignificantCompactValue(9999, locale), "9,999.00");
    assert.equal(formatSignificantCompactValue(123.4, locale), "123.40");
});

test("uses two decimals below ten unless the third or fourth decimals are significant", () => {
    assert.equal(formatSignificantCompactValue(0, locale), "0.00");
    assert.equal(formatSignificantCompactValue(1, locale), "1.00");
    assert.equal(formatSignificantCompactValue(4.2, locale), "4.20");
    assert.equal(formatSignificantCompactValue(1.12, locale), "1.12");
});

test("uses four decimals when the unscaled value has more than two significant decimals", () => {
    assert.equal(formatSignificantCompactValue(0.03529, locale), "0.0352");
    assert.equal(formatSignificantCompactValue(9.9999, locale), "9.9999");
});

test("scales values from one million upward with two decimals and truncation", () => {
    assert.equal(formatSignificantCompactValue(1234567.89, locale), "1.23M");
    assert.equal(formatSignificantCompactValue(3200200, locale), "3.20M");
    assert.equal(formatSignificantCompactValue(12999999.99, locale), "12.99M");
    assert.equal(formatSignificantCompactValue(1234567890.12, locale), "1.23B");
    assert.equal(formatSignificantCompactValue(1234567890123.45, locale), "1.23T");
    assert.equal(
        formatSignificantCompactValue(1234567890123456, locale),
        "1.23Q"
    );
});

test("formats tooltip values without scaling and with two or four decimals", () => {
    assert.equal(formatFullLocaleValue(1, locale), "1.00");
    assert.equal(formatFullLocaleValue(1.12, locale), "1.12");
    assert.equal(formatFullLocaleValue(1.1234, locale), "1.1234");
    assert.equal(formatFullLocaleValue(1234567.8, locale), "1,234,567.80");
    assert.equal(formatFullLocaleValue(1234567.89129, locale), "1,234,567.8912");
});
