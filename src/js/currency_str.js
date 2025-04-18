function int2currencyStr(input_int) {
	if (typeof input_int === "number") {
		return input_int.toLocaleString("ja-JP", { style: "currency", currency: "JPY" });
	}
	try {
		return parseInt(input_int).toLocaleString("ja-JP", { style: "currency", currency: "JPY" });
	} catch (error) {
		return "";
	}
}

module.exports = {
	int2currencyStr,
};
