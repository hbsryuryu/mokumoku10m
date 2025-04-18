// 呼び出し方

// const postItemPurchase = require("../api/post_data_req_purchase");

// postItemPurchase(postDataDict)
//   .then((dataDict) => {
//     console.log(dataDict);
//     // setState(newDict);
//   })
//   .catch((error) => {
//     console.error(error);
//   });

const req_base_url = require("../js/get_base_url");
const baseUrl = req_base_url();

//-------login------
//-------login------
//-------login------
async function post_login_req(postDataDict) {
	// ここチェック機能
	if (postDataDict.mail_address == "" || postDataDict.password == "") {
		throw new Error("データがありません。");
	}

	const response = await fetch(baseUrl + "/api/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postDataDict),
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();
		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		}
		return dataDict;
	}
}

async function post_logout_req(postDataDict) {
	const response = await fetch(baseUrl + "/api/logout", {
		method: "POST",
		credentials: "include",
	});
	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();
		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		}
		return dataDict;
	}
}

async function post_user_register_req(postDataDict) {
	// ここチェック機能
	// if (postDataDict.mail_address == "" || postDataDict.password == "") {
	// 	throw new Error("データがありません。");
	// }

	const response = await fetch(baseUrl + "/api/newregister", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postDataDict),
		credentials: "include", // クッキーを含める
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();

		if (dataDict.length === 0) {
			throw new Error("Regist failed");
		} else if (dataDict["is_post_error"]) {
			throw new Error("情報入力お願いいたします。");
		} else if (dataDict["is_user_exist"]) {
			throw new Error("このメールアドレスのユーザーはすでに登録済みです。");
		} else if (dataDict["is_db_error"]) {
			throw new Error("サーバーが込み合っております。時間をおいてから再度お試しください");
		}

		return dataDict.user_dict;
	}
}

async function postSupplierUserEdit(postDataDict) {
	const response = await fetch(baseUrl + "/api/editsupplieruserregister", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postDataDict),
		credentials: "include", // クッキーを含める
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();

		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		} else if (dataDict["is_db_error"]) {
			throw new Error("サーバーが込み合っております。時間をおいてから再度お試しください");
		}
		return dataDict.user_dict;
	}
}

//-------通常post------
//-------通常post------
//-------通常post------

async function postItemPurchase(postDataDict) {
	const response = await fetch(baseUrl + "/api/postitempurchase", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postDataDict),
		credentials: "include", // クッキーを含める
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();

		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		}
		return dataDict;
	}
}

async function postItemRegistrate(postDataDict) {
	const response = await fetch(baseUrl + "/api/postitemregistrate", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postDataDict),
		credentials: "include", // クッキーを含める
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();

		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		}
		return dataDict;
	}
}
async function postItemEdit(postDataDict) {
	const response = await fetch(baseUrl + "/api/postitemedit", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postDataDict),
		credentials: "include", // クッキーを含める
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();

		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		}
		return dataDict;
	}
}

async function postOrderCreatePaymantUrl(postDataDict) {
	const response = await fetch(baseUrl + "/api/postitempurchaserequrl", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postDataDict),
		credentials: "include", // クッキーを含める
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();

		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		}
		return dataDict;
	}
}

async function postItemReceive(postDataDict) {
	const response = await fetch(baseUrl + "/api/postitemreceive", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postDataDict),
		credentials: "include", // クッキーを含める
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();

		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		}
		return dataDict;
	}
}

async function postItemCancel(postDataDict) {
	const response = await fetch(baseUrl + "/api/postitemrcancel", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postDataDict),
		credentials: "include", // クッキーを含める
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();

		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		}
		return dataDict;
	}
}

async function postContactUs(postDataDict, byteArray) {
	// フォームデータ作成
	const formData = new FormData();
	formData.append("contact_subject", postDataDict.contact_subject);
	formData.append("last_name", postDataDict.last_name);
	formData.append("first_name", postDataDict.first_name);
	formData.append("mail_address", postDataDict.mail_address);
	formData.append("content", postDataDict.content);

	byteArray.forEach((binaryFile, index) => {
		formData.append(`binaryFile_${index}`, binaryFile);
	});

	// FormData()を場合はheader明示しない
	const response = await fetch(baseUrl + "/api/postcontactusreqreq", {
		method: "POST",
		body: formData,
		credentials: "include", // クッキーを含める
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	} else {
		const dataDict = await response.json();

		if (dataDict.length === 0) {
			throw new Error("データがありません。");
		}
		return dataDict;
	}
}

module.exports = {
	post_login_req,
	post_logout_req,
	post_user_register_req,
	postItemPurchase,
	postItemRegistrate,
	postItemReceive,
	postItemCancel,
	postOrderCreatePaymantUrl,
	postItemEdit,
	postSupplierUserEdit,
	postContactUs,
};
