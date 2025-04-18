function req_base_url() {
	var baseUrl = "";
	var hostName = window.location.hostname;
	if (hostName == "localhost" || hostName == "192.168.3.9") {
		baseUrl = "http://" + hostName;
	} else {
		baseUrl = "https://" + hostName;
	}

	var basePort = "";
	var portNumber = String(window.location.port);
	if (portNumber == "443" || portNumber == "80") {
		basePort = "";
	} else if (portNumber == "3002") {
		basePort = ":3000";
	} else {
		basePort = ":" + portNumber;
	}

	return baseUrl + basePort;
}

module.exports = req_base_url;
