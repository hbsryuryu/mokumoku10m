// 呼び出し方
// getItemList()
//   .then((return_array) => {
//     return return_array;
//   })
//   .catch((error) => {
//     console.error(error);
//     return {};
//   });

const req_base_url = require("../js/get_base_url");
const baseUrl = req_base_url();

//-------login------
//-------login------
//-------login------
async function get_user_profile_req() {
	const response = await fetch(baseUrl + "/api/profile", {
		method: "GET",
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

//-------通常get------
//-------通常get------
//-------通常get------

async function getItemList() {
	const response = await fetch(req_base_url() + "/api/getitemlist");

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	}

	const dataDict = await response.json();

	if (dataDict.length === 0) {
		throw new Error("データがありません。");
	}
	const dataArray = dataDict["item_list"];
	return dataArray;
}

async function getItemWithId(id) {
	const response = await fetch(req_base_url() + "/api/getitem" + "?item_id=" + String(id));

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	}

	const dataDict = await response.json();

	if (dataDict.length === 0) {
		throw new Error("データがありません。");
	}
	const dataArray = dataDict["item_list"];
	return dataArray;
}

async function getItemWithUserId(id) {
	const response = await fetch(req_base_url() + "/api/getuseritem" + "?user_id=" + String(id));

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	}

	const dataDict = await response.json();

	if (dataDict.length === 0) {
		throw new Error("データがありません。");
	}
	const dataArray = dataDict["item_list"];
	return dataArray;
}

async function getMyOrderItemList() {
	// "/api/getmyorderlist" + "?is_done=" + String(is_state)
	const response = await fetch(baseUrl + "/api/getmyorderlist", {
		method: "GET",
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	}

	const dataDict = await response.json();

	if (dataDict.length === 0) {
		throw new Error("データがありません。");
	}
	const dataArray = dataDict["item_list"];
	return dataArray;
}

async function getMysaleOrderItemList() {
	// "/api/getmyorderlist" + "?is_done=" + String(is_state)
	const response = await fetch(baseUrl + "/api/getmysaleorderlist", {
		method: "GET",
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	}

	const dataDict = await response.json();

	if (dataDict.length === 0) {
		throw new Error("データがありません。");
	}
	const dataArray = dataDict["item_list"];
	return dataArray;
}

module.exports = {
	get_user_profile_req,
	getItemList,
	getItemWithId,
	getItemWithUserId,
	getMyOrderItemList,
	getMysaleOrderItemList,
};
