import assert from "node:assert/strict";
import test from "node:test";

import {
    formatFullLocaleValue,
    formatSignificantCompactValue,
} from "./formatters.js";

const locale = "en-US";

test("keeps values below one million unscaled", () => {
    assert.equal(
        formatSignificantCompactValue(999999.9999, locale),
        "999,999.99"
    );
});

test("never shows decimals above ten thousand when unscaled", () => {
    assert.equal(
        formatSignificantCompactValue(12345.6789, locale),
        "12,345.67"
    );
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

test("uses four decimals below one hundred when the third or fourth decimals matter", () => {
    assert.equal(formatSignificantCompactValue(0.03529, locale), "0.0352");
    assert.equal(formatSignificantCompactValue(9.9999, locale), "9.9999");
    assert.equal(formatSignificantCompactValue(99.12345, locale), "99.1234");
});

test("keeps two decimals for unscaled values from one hundred upward", () => {
    assert.equal(formatSignificantCompactValue(123.4567, locale), "123.45");
    assert.equal(formatSignificantCompactValue(9999.9999, locale), "9,999.99");
});

test("shows up to eight significant decimals for tiny values above the minimum threshold", () => {
    assert.equal(
        formatSignificantCompactValue(0.00009999, locale),
        "0.00009999"
    );
    assert.equal(
        formatSignificantCompactValue(0.00000001, locale),
        "0.00000001"
    );
});

test("shows less-than marker for values below the minimum tiny-value threshold", () => {
    assert.equal(formatSignificantCompactValue(0.000000001, locale), "<0.0001");
});

test("shows up to eight significant decimals for tiny values above the minimum threshold", () => {
    assert.equal(
        formatSignificantCompactValue(0.00009999, locale),
        "0.00009999"
    );
    assert.equal(
        formatSignificantCompactValue(0.00000001, locale),
        "0.00000001"
    );
});

test("shows less-than marker for values below the minimum tiny-value threshold", () => {
    assert.equal(formatSignificantCompactValue(0.000000001, locale), "<0.0001");
});

test("shows up to eight significant decimals for tiny values above the minimum threshold", () => {
    assert.equal(
        formatSignificantCompactValue(0.00009999, locale),
        "0.00009999"
    );
    assert.equal(
        formatSignificantCompactValue(0.00000001, locale),
        "0.00000001"
    );
});

test("shows less-than marker for values below the minimum tiny-value threshold", () => {
    assert.equal(formatSignificantCompactValue(0.000000001, locale), "<0.0001");
});

test("scales values from one million upward with two decimals and truncation", () => {
    assert.equal(formatSignificantCompactValue(1234567.89, locale), "1.23M");
    assert.equal(formatSignificantCompactValue(3200200, locale), "3.20M");
    assert.equal(formatSignificantCompactValue(12999999.99, locale), "12.99M");
    assert.equal(formatSignificantCompactValue(1234567890.12, locale), "1.23B");
    assert.equal(
        formatSignificantCompactValue(1234567890123.45, locale),
        "1.23T"
    );
    assert.equal(
        formatSignificantCompactValue(1000000000000000, locale),
        "1.00Q"
    );
    assert.equal(
        formatSignificantCompactValue(1000000000000001, locale),
        "1.00Q"
    );
});

test("shows no-limit label for values above one quadrillion when enabled", () => {
    assert.equal(
        formatSignificantCompactValue(
            1000000000000001,
            locale,
            "No limit",
            true
        ),
        "No limit"
    );
    assert.equal(
        formatSignificantCompactValue(
            1000000000000001,
            locale,
            "Sin límite",
            true
        ),
        "Sin límite"
    );
});

test("formats tooltip values without scaling and with two or four decimals", () => {
    assert.equal(formatFullLocaleValue(1, locale), "1.00");
    assert.equal(formatFullLocaleValue(1.12, locale), "1.12");
    assert.equal(formatFullLocaleValue(1.1234, locale), "1.1234");
    assert.equal(formatFullLocaleValue(1234567.8, locale), "1,234,567.80");
    assert.equal(
        formatFullLocaleValue(1234567.89129, locale),
        "1,234,567.8912"
    );
});

test("formats tooltip values for tiny values and large numbers by default", () => {
    assert.equal(formatFullLocaleValue(0.00009999, locale), "0.00009999");
    assert.equal(formatFullLocaleValue(0.000000001, locale), "<0.0001");
    assert.equal(
        formatFullLocaleValue(1000000000000001, locale),
        "1,000,000,000,000,001.0000"
    );
});

test("formats tooltip values with no-limit guardrails when enabled", () => {
    assert.equal(
        formatFullLocaleValue(1000000000000001, locale, "No limit", true),
        "No limit"
    );
    assert.equal(
        formatFullLocaleValue(1000000000000001, locale, "Sin límite", true),
        "Sin límite"
    );
});
