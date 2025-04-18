function funcIsLoginErrorCss(isError) {
	try {
		if (isError) {
			return "g-inp-clr-err";
		} else {
			return "g-inp";
		}
	} catch (error) {
		return "g-inp";
	}
}

module.exports = {
	funcIsLoginErrorCss,
};
